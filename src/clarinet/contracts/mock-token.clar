;; ====================================================================================
;; Mock SIP-010 Token (aeUSDC)
;; ====================================================================================

(use-trait sip-010 .sip-010-trait.sip-010-ft-standard)

(impl-trait .sip-010-trait.sip-010-ft-standard)

(define-constant ERR_NOT_ENOUGH_FUNDS (err u100))

(define-map balances principal uint)
(define-data-var total-supply uint u0)

(define-public (mint (to principal) (amount uint))
  (begin
    (var-set total-supply (+ (var-get total-supply) amount))
    (map-set balances to (+ (default-to u0 (map-get? balances to)) amount))
    (ok true)
  )
)

(define-public (transfer (sender principal) (amount uint) (recipient principal) (memo (optional (buff 34))))
  (let ((sender-balance (default-to u0 (map-get? balances sender))))
    (if (< sender-balance amount)
      ERR_NOT_ENOUGH_FUNDS
      (begin
        (map-set balances sender (- sender-balance amount))
        (map-set balances recipient (+ (default-to u0 (map-get? balances recipient)) amount))
        (ok true)
      )
    )
  )
)

(define-read-only (get-name) (ok "MockUSD"))
(define-read-only (get-symbol) (ok "aeUSDC"))
(define-read-only (get-decimals) (ok u6))
(define-read-only (get-balance (who principal)) (ok (default-to u0 (map-get? balances who))))
(define-read-only (get-total-supply) (ok (var-get total-supply)))
(define-read-only (get-token-uri) (ok none))
