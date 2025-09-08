
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Code, FileText, ExternalLink, Copy, CheckCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

export default function ContractInteraction({ selectedPool, pools }) {
  const [activeTab, setActiveTab] = useState("contract");
  const [copied, setCopied] = useState(false);

  const clarifyContract = `
;; ====================================================================================
;; Options AMM - Clarity Smart Contract Source Code (aeUSDC Version)
;; Version: 1.4.0
;;
;; This contract includes on-chain option pricing logic that approximates
;; a standard model using integer arithmetic, suitable for a blockchain environment.
;; It requires an oracle price feed for accurate calculations.
;; ====================================================================================

;; --- Trait Definitions & Constants ---
(define-trait sip-010-token .sip-010-ft-standard.sip-010-ft-standard)
(define-trait aeUSDC-token .aeusdc-token.aeusdc)

(define-constant CONTRACT_OWNER tx-sender)
(define-constant FEE_RATE u300) ;; 0.3%
(define-constant ONE_8 u100000000) ;; For precision math

;; --- Errors ---
(define-constant ERR_UNAUTHORIZED (err u401))
(define-constant ERR_POOL_EXISTS (err u402))
(define-constant ERR_INVALID_POOL (err u404))
(define-constant ERR_INSUFFICIENT_LIQUIDITY (err u405))
(define-constant ERR_SLIPPAGE_EXCEEDED (err u407))
(define-constant ERR_EXPIRED (err u409))
(define-constant ERR_INSUFFICIENT_COLLATERAL (err u411))
(define-constant ERR_MAX_UTILIZATION_REACHED (err u412))
(define-constant ERR_PRICE_ORACLE_REQUIRED (err u413))

;; --- Data Maps and Variables ---
(define-map pools
  (string-ascii 32) ;; pool-id
  {
    underlying: (string-ascii 10),
    strike-price: uint,
    expiration-block: uint,
    option-type: (string-ascii 4),
    total-liquidity: uint,
    total-lp-tokens: uint,
    total-open-interest: uint,
    max-open-interest-ratio: uint,
    collateralization-ratio: uint,
    implied-volatility: uint, ;; e.g., u4500 for 45%
    contract-address: principal
  }
)
;; ... other maps for lp-positions, option-writers, etc.

;; --- Public Functions ---

;; @desc Creates a new options liquidity pool
(define-public (create-pool
    (pool-id (string-ascii 32))
    (underlying (string-ascii 10))
    (strike-price uint)
    (expiration-block uint)
    (initial-liquidity uint)
    (option-type (string-ascii 4))
    (iv uint)
  )
  (begin
    (asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_UNAUTHORIZED)
    (asserts! (is-none (map-get? pools pool-id)) ERR_POOL_EXISTS)
    (try! (contract-call? .aeusdc-token transfer initial-liquidity tx-sender (as-contract tx-sender) none))
    (map-set pools pool-id
      {
        underlying: underlying,
        strike-price: strike-price,
        expiration-block: expiration-block,
        option-type: option-type,
        total-liquidity: initial-liquidity,
        total-lp-tokens: initial-liquidity,
        total-open-interest: u0,
        max-open-interest-ratio: u8000,
        collateralization-ratio: u12500,
        implied-volatility: iv,
        contract-address: (as-contract tx-sender)
      }
    )
    (try! (ft-mint? lp-token initial-liquidity tx-sender))
    (ok true)
  )
)

;; @desc Buys an option, requires oracle price for calculation
(define-public (buy-option
    (pool-id (string-ascii 32))
    (quantity uint)
    (max-cost uint)
    (oracle-price uint) ;; Price from a trusted oracle
  )
  (let
    (
      (pool (unwrap! (map-get? pools pool-id) ERR_INVALID_POOL))
      (cost (unwrap! (calculate-option-price pool quantity oracle-price) (err u500)))
    )
    (asserts! (<= block-height (get expiration-block pool)) ERR_EXPIRED)
    (asserts! (<= cost max-cost) ERR_SLIPPAGE_EXCEEDED)
    (try! (contract-call? .aeusdc-token transfer cost tx-sender (as-contract tx-sender) none))
    (ok { cost: cost })
  )
)

;; @desc Sells (writes) an option, requires oracle price
(define-public (sell-option
    (pool-id (string-ascii 32))
    (quantity uint)
    (min-premium uint)
    (oracle-price uint) ;; Price from a trusted oracle
  )
  (let
    (
      (pool (unwrap! (map-get? pools pool-id) ERR_INVALID_POOL))
      (premium (unwrap! (calculate-option-price pool quantity oracle-price) (err u500)))
      (notional-value (* premium quantity))
      (new-open-interest (+ (get total-open-interest pool) notional-value))
      (max-allowed-oi (/ (* (get total-liquidity pool) (get max-open-interest-ratio pool)) u10000))
      (required-collateral (/ (* notional-value (get collateralization-ratio pool)) u10000))
    )
    (asserts! (<= block-height (get expiration-block pool)) ERR_EXPIRED)
    (asserts! (>= premium min-premium) ERR_SLIPPAGE_EXCEEDED)
    (asserts! (>= (unwrap-panic (contract-call? .aeusdc-token get-balance tx-sender)) required-collateral) ERR_INSUFFICIENT_COLLATERAL)
    (asserts! (<= new-open-interest max-allowed-oi) ERR_MAX_UTILIZATION_REACHED)

    (try! (contract-call? .aeusdc-token transfer required-collateral tx-sender (as-contract tx-sender) none))
    (map-set pools pool-id (merge pool { total-open-interest: new-open-interest }))
    (try! (as-contract (contract-call? .aeusdc-token transfer premium (as-contract tx-sender) tx-sender none)))
    (ok { premium: premium, collateral: required-collateral })
  )
)

;; --- Read-Only Functions ---
(define-read-only (get-option-price (pool-id (string-ascii 32)) (quantity uint) (oracle-price uint))
  (let ((pool (unwrap! (map-get? pools pool-id) ERR_INVALID_POOL)))
    (calculate-option-price pool quantity oracle-price)
  )
)

;; --- Private Helper Functions ---
(define-private (sqrt-int (n uint))
  ;; Integer square root using Newton's method
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

;; @desc Calculates option price using on-chain approximation model
(define-private (calculate-option-price (pool (tuple
    (strike-price uint)
    (expiration-block uint)
    (option-type (string-ascii 4))
    (total-liquidity uint)
    (implied-volatility uint)
    ;; ... other fields
  )) (quantity uint) (oracle-price uint))
  (let
    (
      (strike (get strike-price pool))
      (time-to-expiry (- (get expiration-block pool) block-height))

      ;; 1. Calculate Intrinsic Value
      (intrinsic-value (if (is-eq (get option-type pool) "call")
        (if (> oracle-price strike) (- oracle-price strike) u0)
        (if (> strike oracle-price) (- strike oracle-price) u0)
      ))

      ;; 2. Calculate Time Value (Approximation)
      ;; Formula: TimeValue = (Volatility * StrikePrice * sqrt(TimeToExpiry)) / Constant
      (vol (get implied-volatility pool)) ;; e.g., u4500 for 45%
      (sqrt-time (sqrt-int (* time-to-expiry ONE_8))) ;; sqrt(T) with precision
      (time-value-numerator (* vol strike sqrt-time))
      (time-value (/ time-value-numerator u3000000)) ;; Denominator is a calibration constant

      ;; 3. Calculate Theoretical Price
      (theoretical-price (+ intrinsic-value time-value))

      ;; 4. Apply AMM Price Impact
      (trade-value (* theoretical-price quantity))
      (liquidity (get total-liquidity pool))
      (impact-ratio (if (> liquidity u0) (/ (* trade-value ONE_8) liquidity) u0))
      ;; Simple impact: base fee + ratio^2
      (price-impact (+ FEE_RATE (/ (* impact-ratio impact-ratio) ONE_8)))
      (final-price (/ (* theoretical-price (+ ONE_8 price-impact)) ONE_8))
    )
    (ok final-price)
  )
)
`;

  const copyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <Alert className="border-blue-500/50 bg-blue-500/10">
        <FileText className="h-4 w-4 text-blue-400" />
        <AlertDescription className="text-blue-300">
          This is an example of what the AMM's Clarity smart contract source code looks like. It includes on-chain pricing logic.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="contract" onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-slate-700/30">
          <TabsTrigger value="contract" className="data-[state=active]:bg-blue-500/30">
            Source Code
          </TabsTrigger>
          <TabsTrigger value="interface" className="data-[state=active]:bg-green-500/30">
            Functions
          </TabsTrigger>
          <TabsTrigger value="deployment" className="data-[state=active]:bg-purple-500/30">
            Deployment
          </TabsTrigger>
        </TabsList>

        <TabsContent value="contract" className="space-y-4">
          <Card className="bg-slate-700/30 border-slate-600">
            <CardHeader className="flex flex-row justify-between items-center">
              <CardTitle className="text-white flex items-center gap-2">
                <Code className="w-5 h-5" />
                amm-contract.clar
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(clarifyContract, 'contract')}
                className="text-slate-300 hover:text-white hover:bg-slate-700"
              >
                {copied === 'contract' ? <CheckCircle className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
              </Button>
            </CardHeader>
            <CardContent>
              <pre className="text-xs text-slate-300 bg-slate-900/50 p-4 rounded-lg overflow-x-auto">
                <code>{clarifyContract}</code>
              </pre>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="interface" className="space-y-4">
          <div className="grid gap-4">
            <Card className="bg-slate-700/30 border-slate-600">
              <CardHeader>
                <CardTitle className="text-white text-lg">Contract Functions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="p-3 bg-slate-800/50 rounded-lg">
                    <h4 className="text-green-400 font-semibold mb-2">buy-option</h4>
                    <p className="text-slate-300 text-sm">Buys an option from the AMM. Requires a trusted `oracle-price` to calculate cost.</p>
                    <Badge className="mt-2 bg-green-500/20 text-green-300">Public Function</Badge>
                  </div>

                  <div className="p-3 bg-slate-800/50 rounded-lg">
                    <h4 className="text-red-400 font-semibold mb-2">sell-option</h4>
                    <p className="text-slate-300 text-sm">Sells (writes) an option, locking collateral. Also requires `oracle-price`.</p>
                    <Badge className="mt-2 bg-red-500/20 text-red-300">Public Function</Badge>
                  </div>
                  
                  <div className="p-3 bg-slate-800/50 rounded-lg">
                    <h4 className="text-blue-400 font-semibold mb-2">calculate-option-price</h4>
                    <p className="text-slate-300 text-sm">A private helper function that runs the on-chain pricing model (Intrinsic + Time Value + AMM Impact).</p>
                    <Badge className="mt-2 bg-blue-500/20 text-blue-300">Private Function</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="deployment" className="space-y-4">
          <Card className="bg-slate-700/30 border-slate-600">
            <CardHeader>
              <CardTitle className="text-white">Deployment Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-slate-300">This contract would be deployed to the Stacks blockchain. Its address would then be used by the frontend to interact with the AMM.</p>
              <Button className="w-full" variant="outline" disabled>
                <ExternalLink className="w-4 h-4 mr-2"/>
                View on Stacks Explorer (Example)
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
