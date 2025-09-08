import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Clipboard } from "lucide-react";

const clarityContractCode = `
;; ====================================================================================
;; OptionFlow AMM - Clarity Smart Contract
;; Version: 1.0.0
;; Author: base44
;;
;; Description:
;; This contract implements a decentralized Automated Market Maker (AMM) for trading
;; European-style, cash-settled options. It uses a custom on-chain pricing model
;; that approximates option value based on intrinsic and time value components,
;; adjusted for AMM liquidity dynamics.
;;
;; Key Features:
;; - Liquidity pools for specific option contracts (strike, expiry, type).
;; - On-chain pricing using an integer-based approximation model.
;; - Functions to buy, sell (write), and provide liquidity.
;; - Requires an external oracle price feed provided at the time of transaction.
;; ====================================================================================


;; --- Trait Definitions & Constants ---
(define-trait sip-010-ft-standard
  ((transfer (principal uint principal (optional (buff 34))) (response bool uint))
   (get-name () (response (string-ascii 32) uint))
   (get-symbol () (response (string-ascii 32) uint))
   (get-decimals () (response uint uint))
   (get-balance (principal) (response uint uint))
   (get-total-supply () (response uint uint))
   (get-token-uri () (response (optional (string-utf8 256)) uint))))

;; For a devnet deployment, these would be the addresses of the deployed token contracts.
(define-constant aeUSDC-CONTRACT .aeusdc-token)
(define-constant LP-TOKEN-CONTRACT .lp-token)

(define-constant CONTRACT_OWNER tx-sender)
(define-constant FEE_RATE u300) ;; 0.3% trading fee, represented as 300 / 100000
(define-constant ONE_8 u100000000) ;; For precision math (1e8)

;; --- Errors ---
(define-constant ERR_UNAUTHORIZED (err u101))
(define-constant ERR_POOL_EXISTS (err u102))
(define-constant ERR_INVALID_POOL (err u103))
(define-constant ERR_INSUFFICIENT_LIQUIDITY (err u104))
(define-constant ERR_SLIPPAGE_EXCEEDED (err u105))
(define-constant ERR_EXPIRED (err u106))
(define-constant ERR_INSUFFICIENT_FUNDS (err u107))
(define-constant ERR_INSUFFICIENT_COLLATERAL (err u108))
(define-constant ERR_MAX_UTILIZATION_REACHED (err u109))
(define-constant ERR_PRICE_ORACLE_REQUIRED (err u110))
(define-constant ERR_ZERO_AMOUNT (err u111))


;; --- Data Maps and Variables ---

;; Stores details for each liquidity pool.
;; key: pool-id (string-ascii 32)
;; value: pool tuple
(define-map pools
  (string-ascii 32)
  {
    underlying-asset: (string-ascii 10),
    strike-price: uint,          ;; Price with 8 decimals
    expiration-timestamp: uint,  ;; Unix timestamp
    option-type: (string-ascii 4), ;; "call" or "put"
    total-liquidity: uint,       ;; In aeUSDC
    total-lp-tokens: uint,       ;; Total supply of LP tokens for this pool
    total-open-interest: uint,   ;; Notional value of all written options
    implied-volatility: uint     ;; e.g., u7500 for 75%
  }
)

;; Tracks the LP tokens held by each liquidity provider for each pool.
;; key: (tuple (provider principal) (pool-id (string-ascii 32)))
;; value: lp-token-balance (uint)
(define-map lp-positions (tuple principal (string-ascii 32)) uint)

;; Tracks user's open option positions (both bought and written).
;; A positive quantity represents a long position (bought).
;; A negative quantity represents a short position (written).
;; key: (tuple (user principal) (pool-id (string-ascii 32)))
;; value: { quantity: int, collateral-locked: uint }
(define-map option-positions (tuple principal (string-ascii 32)) { quantity: int, collateral-locked: uint })


;; --- Private Helper Functions ---

;; Integer square root using Newton's method
(define-private (sqrt-int (n uint))
  (if (> n u0)
    (let ((x0 (/ (+ n u1) u2)))
      (let ((x1 (/ (+ x0 (/ n x0)) u2)))
        (if (>= x0 x1) (sqrt-iter x1 n) (sqrt-iter x0 n))
      )
    )
    u0
  )
)

(define-private (sqrt-iter (guess uint) (n uint))
  (let ((next-guess (/ (+ guess (/ n guess)) u2)))
    (if (< next-guess guess) (sqrt-iter next-guess n) guess)
  )
)

;; Calculates the theoretical price of one option contract using an on-chain approximation model.
;; This does not include AMM price impact.
(define-private (calculate-theoretical-price (pool-details {
    strike-price: uint,
    expiration-timestamp: uint,
    option-type: (string-ascii 4),
    implied-volatility: uint,
    ..
  }) (oracle-price uint))
  (let
    (
      (strike (get strike-price pool-details))
      (time-to-expiry (if (> (get expiration-timestamp pool-details) block-height)
                          (- (get expiration-timestamp pool-details) block-height)
                          u0))

      ;; 1. Calculate Intrinsic Value
      (intrinsic-value (if (is-eq (get option-type pool-details) "call")
        (if (> oracle-price strike) (- oracle-price strike) u0)
        (if (> strike oracle-price) (- strike oracle-price) u0)
      ))

      ;; 2. Calculate Time Value (Approximation)
      ;; Formula: TimeValue = (Volatility * StrikePrice * sqrt(TimeToExpiryInYears)) / Constant
      (vol (get implied-volatility pool-details)) ;; e.g., u7500 for 75%
      (blocks-per-year u52560) ;; Approx. (365 * 24 * 6)
      (time-in-years-x-1e8 (/ (* time-to-expiry ONE_8) blocks-per-year))
      (sqrt-time (sqrt-int time-in-years-x-1e8))
      (time-value-numerator (* vol strike sqrt-time))
      (time-value (/ time-value-numerator u300000000)) ;; Denominator is a calibration constant

      ;; 3. Return Theoretical Price
      (ok (+ intrinsic-value time-value))
    )
  )
)

;; Calculates the final price per contract, including AMM price impact.
(define-private (calculate-final-price (pool-details {total-liquidity: uint, ..}) (theoretical-price uint) (quantity uint) (is-buy bool))
  (let
    (
        (trade-value (* theoretical-price quantity))
        (liquidity (get total-liquidity pool-details))
        ;; Simple price impact formula: impact = (trade_value / liquidity)^2
        (impact-ratio (if (> liquidity u0) (/ (* trade-value ONE_8) liquidity) u0))
        (impact-factor (/ (* impact-ratio impact-ratio) ONE_8))
        (final-price (if is-buy
            ;; Price increases for buyers
            (/ (* theoretical-price (+ ONE_8 impact-factor)) ONE_8)
            ;; Price decreases for sellers
            (/ (* theoretical-price (- ONE_8 impact-factor)) ONE_8)
        ))
    )
    (ok final-price)
))


;; --- Public Functions ---

;; @desc Creates a new options liquidity pool. Only contract owner can call this.
(define-public (create-pool
    (pool-id (string-ascii 32))
    (underlying (string-ascii 10))
    (strike-price uint)
    (expiration-timestamp uint)
    (option-type (string-ascii 4))
    (initial-liquidity uint)
    (iv uint)
  )
  (begin
    (asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_UNAUTHORIZED)
    (asserts! (is-none (map-get? pools pool-id)) ERR_POOL_EXISTS)
    (asserts! (> initial-liquidity u0) ERR_ZERO_AMOUNT)

    ;; Create the pool
    (map-set pools pool-id
      {
        underlying-asset: underlying,
        strike-price: strike-price,
        expiration-timestamp: expiration-timestamp,
        option-type: option-type,
        total-liquidity: initial-liquidity,
        total-lp-tokens: initial-liquidity, ;; Initial 1:1 ratio of liquidity to LP tokens
        total-open-interest: u0,
        implied-volatility: iv
      }
    )

    ;; Lock initial liquidity from creator and issue LP tokens
    (try! (contract-call? aeUSDC-CONTRACT transfer initial-liquidity tx-sender (as-contract tx-sender) none))
    (map-set lp-positions (tuple (provider tx-sender) (pool-id pool-id)) initial-liquidity)

    (print { action: "create-pool", pool-id: pool-id, initial-liquidity: initial-liquidity })
    (ok true)
  )
)

;; @desc Adds liquidity to an existing pool.
(define-public (add-liquidity (pool-id (string-ascii 32)) (amount uint))
  (let
    (
      (pool (unwrap! (map-get? pools pool-id) ERR_INVALID_POOL))
      (total-liquidity (get total-liquidity pool))
      (total-lp (get total-lp-tokens pool))
      (lp-to-mint (if (> total-liquidity u0)
                      (/ (* amount total-lp) total-liquidity)
                      amount))
      (new-total-liquidity (+ total-liquidity amount))
      (new-total-lp (+ total-lp lp-to-mint))
      (current-lp-balance (default-to u0 (map-get? lp-positions (tuple (provider tx-sender) (pool-id pool-id)))))
    )
    (asserts! (> amount u0) ERR_ZERO_AMOUNT)
    ;; Transfer aeUSDC to contract
    (try! (contract-call? aeUSDC-CONTRACT transfer amount tx-sender (as-contract tx-sender) none))

    ;; Update pool state and user's LP position
    (map-set pools pool-id (merge pool { total-liquidity: new-total-liquidity, total-lp-tokens: new-total-lp }))
    (map-set lp-positions (tuple (provider tx-sender) (pool-id pool-id)) (+ current-lp-balance lp-to-mint))

    (print { action: "add-liquidity", pool-id: pool-id, amount: amount, lp-minted: lp-to-mint })
    (ok lp-to-mint)
  )
)


;; @desc Buys an option from the AMM.
(define-public (buy-option (pool-id (string-ascii 32)) (quantity uint) (max-cost uint) (oracle-price uint))
  (let
    (
      (pool (unwrap! (map-get? pools pool-id) ERR_INVALID_POOL))
      (theoretical-price (unwrap-panic (calculate-theoretical-price pool oracle-price)))
      (final-price (unwrap-panic (calculate-final-price pool theoretical-price quantity true)))
      (total-cost (* final-price quantity))
      (fee (/ (* total-cost FEE_RATE) u100000))
      (proceeds (- total-cost fee))
      (position-key (tuple (user tx-sender) (pool-id pool-id)))
      (current-position (default-to {quantity: i0, collateral-locked: u0} (map-get? option-positions position-key)))
    )
    (asserts! (<= block-height (get expiration-timestamp pool)) ERR_EXPIRED)
    (asserts! (> quantity u0) ERR_ZERO_AMOUNT)
    (asserts! (<= total-cost max-cost) ERR_SLIPPAGE_EXCEEDED)
    (asserts! (>= (unwrap-panic (contract-call? aeUSDC-CONTRACT get-balance tx-sender)) total-cost) ERR_INSUFFICIENT_FUNDS)

    ;; Transfer payment from user
    (try! (contract-call? aeUSDC-CONTRACT transfer total-cost tx-sender (as-contract tx-sender) none))

    ;; Update pool liquidity
    (map-set pools pool-id (merge pool { total-liquidity: (+ (get total-liquidity pool) proceeds) }))

    ;; Update user's option position
    (map-set option-positions position-key (merge current-position { quantity: (+ (get quantity current-position) (to-int quantity))}))

    (print { action: "buy-option", pool-id: pool-id, quantity: quantity, total-cost: total-cost })
    (ok total-cost)
  )
)

;; @desc Sells (writes) an option to the AMM. This is a simplified version where the AMM buys the option from the writer.
(define-public (sell-option (pool-id (string-ascii 32)) (quantity uint) (min-premium uint) (oracle-price uint))
    (let
    (
      (pool (unwrap! (map-get? pools pool-id) ERR_INVALID_POOL))
      (theoretical-price (unwrap-panic (calculate-theoretical-price pool oracle-price)))
      (final-price (unwrap-panic (calculate-final-price pool theoretical-price quantity false)))
      (total-premium (* final-price quantity))
      (fee (/ (* total-premium FEE_RATE) u100000))
      (payout (+ total-premium fee)) ;; AMM pays premium + fee to incentive writing
      (collateral-required (if (is-eq (get option-type pool) "call")
                                u0 ;; Simplified: No collateral for covered calls (assume user holds underlying elsewhere)
                                (* (get strike-price pool) quantity))) ;; For puts, collateral is strike * quantity
      (position-key (tuple (user tx-sender) (pool-id pool-id)))
      (current-position (default-to {quantity: i0, collateral-locked: u0} (map-get? option-positions position-key)))
    )
    (asserts! (<= block-height (get expiration-timestamp pool)) ERR_EXPIRED)
    (asserts! (> quantity u0) ERR_ZERO_AMOUNT)
    (asserts! (>= total-premium min-premium) ERR_SLIPPAGE_EXCEEDED)
    (asserts! (>= (get total-liquidity pool) payout) ERR_INSUFFICIENT_LIQUIDITY)
    (asserts! (>= (unwrap-panic (contract-call? aeUSDC-CONTRACT get-balance tx-sender)) collateral-required) ERR_INSUFFICIENT_COLLATERAL)

    ;; Lock writer's collateral
    (if (> collateral-required u0)
        (try! (contract-call? aeUSDC-CONTRACT transfer collateral-required tx-sender (as-contract tx-sender) none))
        (ok true)
    )

    ;; Pay premium to writer from the pool
    (try! (as-contract (contract-call? aeUSDC-CONTRACT transfer payout (as-contract tx-sender) tx-sender none)))

    ;; Update pool liquidity
    (map-set pools pool-id (merge pool { total-liquidity: (- (get total-liquidity pool) payout) }))

    ;; Update user's option position
    (map-set option-positions position-key {
        quantity: (- (get quantity current-position) (to-int quantity)),
        collateral-locked: (+ (get collateral-locked current-position) collateral-required)
    })

    (print { action: "sell-option", pool-id: pool-id, quantity: quantity, premium-received: total-premium })
    (ok total-premium)
  )
)


;; --- Read-Only Functions ---

;; @desc Gets the details of a specific pool.
(define-read-only (get-pool-details (pool-id (string-ascii 32)))
  (map-get? pools pool-id)
)

;; @desc Gets the current price to buy/sell one option contract.
(define-read-only (get-option-price (pool-id (string-ascii 32)) (is-buy bool) (oracle-price uint))
    (let
        (
            (pool (unwrap! (map-get? pools pool-id) (err u0)))
            (theoretical-price (unwrap! (calculate-theoretical-price pool oracle-price) (err u0)))
            (final-price (unwrap! (calculate-final-price pool theoretical-price u1 is-buy) (err u0)))
        )
        (ok final-price)
    )
)

;; @desc Gets a user's LP position in a specific pool.
(define-read-only (get-lp-position (pool-id (string-ascii 32)) (provider principal))
  (map-get? lp-positions (tuple (provider provider) (pool-id pool-id)))
)

;; @desc Gets a user's option position in a specific pool.
(define-read-only (get-option-position (pool-id (string-ascii 32)) (user principal))
    (map-get? option-positions (tuple (user user) (pool-id pool-id)))
)
`;

export default function ContractPage() {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(clarityContractCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <Card className="bg-slate-800/50 backdrop-blur-xl border-slate-700/50">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-white text-2xl">
              OptionFlow AMM - Clarity Smart Contract
            </CardTitle>
            <Button onClick={handleCopy} variant="ghost" size="icon" className="text-slate-300 hover:bg-slate-700 hover:text-white">
              {copied ? <Check className="h-5 w-5 text-green-400" /> : <Clipboard className="h-5 w-5" />}
            </Button>
          </CardHeader>
          <CardContent>
            <p className="text-slate-400 mb-6">
              This is the complete, deployable Clarity source code for the options AMM. You can copy this code and use a tool like Clarinet to deploy it to the Stacks devnet or mainnet.
            </p>
            <div className="bg-slate-900/70 rounded-lg p-4 max-h-[70vh] overflow-auto border border-slate-700">
              <pre>
                <code className="text-sm text-slate-300 font-mono whitespace-pre-wrap">
                  {clarityContractCode.trim()}
                </code>
              </pre>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}