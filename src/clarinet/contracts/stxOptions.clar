;; ====================================================================================
;; OptionFlow AMM - Clarity Smart Contract
;; Version: 1.0.7
;; Author: base44
;;
;; Description:
;; This contract implements a decentralized Automated Market Maker (AMM) for trading
;; European-style, cash-settled options. It uses a custom on-chain pricing model
;; that approximates option value based on intrinsic and time value components,
;; adjusted for AMM liquidity dynamics.
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
;; key: tuple with named fields (user, pool-id)
;; value: lp-token-balance (uint)
(define-map lp-positions (tuple (user principal) (pool-id (string-ascii 32))) uint)

;; Tracks user option positions (both bought and written).
;; A positive quantity represents a long position (bought).
;; A negative quantity represents a short position (written).
;; key: tuple with named fields (user, pool-id)
;; value: { quantity: int, collateral-locked: uint }
(define-map option-positions (tuple (user principal) (pool-id (string-ascii 32))) { quantity: int, collateral-locked: uint })


;; --- Private Helper Functions ---

;; Simple integer square root approximation without recursion
;; Uses a basic approximation method that avoids interdependencies
(define-private (sqrt-approx (n uint))
  (if (<= n u1)
    n
    (let ((x (/ n u2)))
      (let ((improved (/ (+ x (/ n x)) u2)))
        (if (< (abs-diff improved x) u2)
          improved
          (/ (+ improved (/ n improved)) u2)
        )
      )
    )
  )
)

;; Helper function to calculate absolute difference
(define-private (abs-diff (a uint) (b uint))
  (if (>= a b) (- a b) (- b a))
)

;; Calculates the theoretical price of one option contract using an on-chain approximation model.
;; This does not include AMM price impact.
(define-private (calculate-theoretical-price (strike-price uint) (expiration-timestamp uint) (option-type (string-ascii 4)) (implied-volatility uint) (oracle-price uint))
  (let
    (
      (time-to-expiry (if (> expiration-timestamp block-height)
                          (- expiration-timestamp block-height)
                          u0))

      ;; 1. Calculate Intrinsic Value
      (intrinsic-value (if (is-eq option-type "call")
        (if (> oracle-price strike-price) (- oracle-price strike-price) u0)
        (if (> strike-price oracle-price) (- strike-price oracle-price) u0)
      ))

      ;; 2. Calculate Time Value (Approximation)
      ;; Formula: TimeValue = (Volatility * StrikePrice * sqrt(TimeToExpiryInYears)) / Constant
      (vol implied-volatility) ;; e.g., u7500 for 75%
      (blocks-per-year u52560) ;; Approx. (365 * 24 * 6)
      (time-in-years-x-1e8 (/ (* time-to-expiry ONE_8) blocks-per-year))
      (sqrt-time (sqrt-approx time-in-years-x-1e8))
      (time-value-numerator (* vol strike-price sqrt-time))
      (time-value (/ time-value-numerator u300000000)) ;; Denominator is a calibration constant

      ;; 3. Return Theoretical Price
    )
    (ok (+ intrinsic-value time-value))
  )
)

;; Calculates the final price per contract, including AMM price impact.
(define-private (calculate-final-price (total-liquidity uint) (theoretical-price uint) (quantity uint) (is-buy bool))
  (let
    (
        (trade-value (* theoretical-price quantity))
        (impact-ratio (if (> total-liquidity u0) (/ (* trade-value ONE_8) total-liquidity) u0))
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
    (token-contract <sip-010-ft-standard>)
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

    ;; Lock initial liquidity from creator and issue LP tokens - FIXED PARAMETER ORDER
    (try! (contract-call? token-contract transfer tx-sender initial-liquidity (as-contract tx-sender) none))
    (map-set lp-positions (tuple (user tx-sender) (pool-id pool-id)) initial-liquidity)

    (print { action: "create-pool", pool-id: pool-id, initial-liquidity: initial-liquidity })
    (ok true)
  )
)

;; @desc Adds liquidity to an existing pool.
(define-public (add-liquidity (pool-id (string-ascii 32)) (amount uint) (token-contract <sip-010-ft-standard>))
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
      (current-lp-balance (default-to u0 (map-get? lp-positions (tuple (user tx-sender) (pool-id pool-id)))))
    )
    (asserts! (> amount u0) ERR_ZERO_AMOUNT)
    ;; Transfer aeUSDC to contract - FIXED PARAMETER ORDER
    (try! (contract-call? token-contract transfer tx-sender amount (as-contract tx-sender) none))

    ;; Update pool state and user LP position
    (map-set pools pool-id (merge pool { total-liquidity: new-total-liquidity, total-lp-tokens: new-total-lp }))
    (map-set lp-positions (tuple (user tx-sender) (pool-id pool-id)) (+ current-lp-balance lp-to-mint))

    (print { action: "add-liquidity", pool-id: pool-id, amount: amount, lp-minted: lp-to-mint })
    (ok lp-to-mint)
  )
)


;; @desc Buys an option from the AMM.
(define-public (buy-option (pool-id (string-ascii 32)) (quantity uint) (max-cost uint) (oracle-price uint) (token-contract <sip-010-ft-standard>))
  (let
    (
      (pool (unwrap! (map-get? pools pool-id) ERR_INVALID_POOL))
      (theoretical-price (unwrap-panic (calculate-theoretical-price (get strike-price pool) (get expiration-timestamp pool) (get option-type pool) (get implied-volatility pool) oracle-price)))
      (final-price (unwrap-panic (calculate-final-price (get total-liquidity pool) theoretical-price quantity true)))
      (total-cost (* final-price quantity))
      (fee (/ (* total-cost FEE_RATE) u100000))
      (proceeds (- total-cost fee))
      (current-position (default-to {quantity: 0, collateral-locked: u0} (map-get? option-positions (tuple (user tx-sender) (pool-id pool-id)))))
    )
    (asserts! (<= block-height (get expiration-timestamp pool)) ERR_EXPIRED)
    (asserts! (> quantity u0) ERR_ZERO_AMOUNT)
    (asserts! (<= total-cost max-cost) ERR_SLIPPAGE_EXCEEDED)
    (asserts! (>= (unwrap-panic (contract-call? token-contract get-balance tx-sender)) total-cost) ERR_INSUFFICIENT_FUNDS)

    ;; Transfer payment from user - FIXED PARAMETER ORDER
    (try! (contract-call? token-contract transfer tx-sender total-cost (as-contract tx-sender) none))

    ;; Update pool liquidity
    (map-set pools pool-id (merge pool { total-liquidity: (+ (get total-liquidity pool) proceeds) }))

    ;; Update user option position
    (map-set option-positions (tuple (user tx-sender) (pool-id pool-id)) (merge current-position { quantity: (+ (get quantity current-position) (to-int quantity))}))

    (print { action: "buy-option", pool-id: pool-id, quantity: quantity, total-cost: total-cost })
    (ok total-cost)
  )
)

;; @desc Sells (writes) an option to the AMM. This is a simplified version where the AMM buys the option from the writer.
(define-public (sell-option (pool-id (string-ascii 32)) (quantity uint) (min-premium uint) (oracle-price uint) (token-contract <sip-010-ft-standard>))
    (let
    (
      (pool (unwrap! (map-get? pools pool-id) ERR_INVALID_POOL))
      (theoretical-price (unwrap-panic (calculate-theoretical-price (get strike-price pool) (get expiration-timestamp pool) (get option-type pool) (get implied-volatility pool) oracle-price)))
      (final-price (unwrap-panic (calculate-final-price (get total-liquidity pool) theoretical-price quantity false)))
      (total-premium (* final-price quantity))
      (fee (/ (* total-premium FEE_RATE) u100000))
      (payout (+ total-premium fee)) ;; AMM pays premium + fee to incentive writing
      (collateral-required (if (is-eq (get option-type pool) "call")
                                u0 ;; Simplified: No collateral for covered calls (assume user holds underlying elsewhere)
                                (* (get strike-price pool) quantity))) ;; For puts, collateral is strike * quantity
      (current-position (default-to {quantity: 0, collateral-locked: u0} (map-get? option-positions (tuple (user tx-sender) (pool-id pool-id)))))
    )
    (asserts! (<= block-height (get expiration-timestamp pool)) ERR_EXPIRED)
    (asserts! (> quantity u0) ERR_ZERO_AMOUNT)
    (asserts! (>= total-premium min-premium) ERR_SLIPPAGE_EXCEEDED)
    (asserts! (>= (get total-liquidity pool) payout) ERR_INSUFFICIENT_LIQUIDITY)
    (asserts! (>= (unwrap-panic (contract-call? token-contract get-balance tx-sender)) collateral-required) ERR_INSUFFICIENT_COLLATERAL)

    ;; Lock writer collateral if required - FIXED TYPE MISMATCH
    (if (> collateral-required u0)
        (try! (contract-call? token-contract transfer tx-sender collateral-required (as-contract tx-sender) none))
        true ;; Return bool instead of (ok true)
    )

    ;; Pay premium to writer from the pool - FIXED PARAMETER ORDER
    (try! (as-contract (contract-call? token-contract transfer (as-contract tx-sender) payout tx-sender none)))

    ;; Update pool liquidity
    (map-set pools pool-id (merge pool { total-liquidity: (- (get total-liquidity pool) payout) }))

    ;; Update user option position
    (map-set option-positions (tuple (user tx-sender) (pool-id pool-id)) {
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
            (theoretical-price (unwrap! (calculate-theoretical-price (get strike-price pool) (get expiration-timestamp pool) (get option-type pool) (get implied-volatility pool) oracle-price) (err u0)))
            (final-price (unwrap! (calculate-final-price (get total-liquidity pool) theoretical-price u1 is-buy) (err u0)))
        )
        (ok final-price)
    )
)

;; @desc Gets a user LP position in a specific pool.
(define-read-only (get-lp-position (pool-id (string-ascii 32)) (provider principal))
  (map-get? lp-positions (tuple (user provider) (pool-id pool-id)))
)

;; @desc Gets a user option position in a specific pool.
(define-read-only (get-option-position (pool-id (string-ascii 32)) (user principal))
    (map-get? option-positions (tuple (user user) (pool-id pool-id)))
)