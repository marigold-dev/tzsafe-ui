const v0_4_0 = `
{ parameter
    (or (list %update_operators
           (or (pair %add_operator (address %owner) (address %operator) (nat %token_id))
               (pair %remove_operator (address %owner) (address %operator) (nat %token_id))))
        (or (pair %balance_of
               (list %requests (pair (address %owner) (nat %token_id)))
               (contract %callback
                  (list (pair (pair %request (address %owner) (nat %token_id)) (nat %balance)))))
            (or (list %transfer
                   (pair (address %from_) (list %txs (pair (address %to_) (nat %token_id) (nat %amount)))))
                (or %contract
                   (unit %default)
                   (or (list %create_proposal
                          (or (pair %transfer (address %target) (mutez %amount))
                              (or (pair %execute_lambda
                                     (option %metadata bytes)
                                     (lambda %lambda unit (list operation)))
                                  (or (nat %adjust_quorum)
                                      (or (nat %adjust_supermajority)
                                          (or (int %adjust_voting_duration)
                                              (or (int %adjust_execution_duration)
                                                  (or (nat %adjust_token)
                                                      (or (pair %add_or_update_metadata (string %key) (bytes %value))
                                                          (or (string %remove_metadata)
                                                              (or (bytes %proof_of_event)
                                                                  (or (pair %mint (address %owner) (nat %amount) (nat %token_id))
                                                                      (pair %create_token (nat %token_id) (map %token_info string bytes))))))))))))))
                       (or (pair %sign_proposal
                              (nat %proposal_id)
                              (list %proposal_contents
                                 (or (pair %transfer (address %target) (mutez %amount))
                                     (or (pair %execute_lambda
                                            (option %metadata bytes)
                                            (lambda %lambda unit (list operation)))
                                         (or (nat %adjust_quorum)
                                             (or (nat %adjust_supermajority)
                                                 (or (int %adjust_voting_duration)
                                                     (or (int %adjust_execution_duration)
                                                         (or (nat %adjust_token)
                                                             (or (pair %add_or_update_metadata (string %key) (bytes %value))
                                                                 (or (string %remove_metadata)
                                                                     (or (bytes %proof_of_event)
                                                                         (or (pair %mint (address %owner) (nat %amount) (nat %token_id))
                                                                             (pair %create_token (nat %token_id) (map %token_info string bytes))))))))))))))
                              (pair %votes (or %vote (unit %yes) (or (unit %no) (unit %abstention))) (nat %quantity)))
                           (or (pair %resolve_proposal
                                  (nat %proposal_id)
                                  (list %proposal_contents
                                     (or (pair %transfer (address %target) (mutez %amount))
                                         (or (pair %execute_lambda
                                                (option %metadata bytes)
                                                (lambda %lambda unit (list operation)))
                                             (or (nat %adjust_quorum)
                                                 (or (nat %adjust_supermajority)
                                                     (or (int %adjust_voting_duration)
                                                         (or (int %adjust_execution_duration)
                                                             (or (nat %adjust_token)
                                                                 (or (pair %add_or_update_metadata (string %key) (bytes %value))
                                                                     (or (string %remove_metadata)
                                                                         (or (bytes %proof_of_event)
                                                                             (or (pair %mint (address %owner) (nat %amount) (nat %token_id))
                                                                                 (pair %create_token (nat %token_id) (map %token_info string bytes)))))))))))))))
                               (bytes %proof_of_event_challenge)))))))) ;
  storage
    (pair (pair %wallet
             (nat %proposal_counter)
             (big_map %proposals
                nat
                (pair (or %state
                         (unit %proposing)
                         (or (unit %executed) (or (unit %rejected) (unit %expired))))
                      (map %votes (or (unit %yes) (or (unit %no) (unit %abstention))) nat)
                      (pair %proposer (address %actor) (timestamp %timestamp))
                      (option %resolver (pair (address %actor) (timestamp %timestamp)))
                      (list %contents
                         (or (pair %transfer (address %target) (mutez %amount))
                             (or (pair %execute_lambda
                                    (option %metadata bytes)
                                    (lambda %lambda unit (list operation)))
                                 (or (nat %adjust_quorum)
                                     (or (nat %adjust_supermajority)
                                         (or (int %adjust_voting_duration)
                                             (or (int %adjust_execution_duration)
                                                 (or (nat %adjust_token)
                                                     (or (pair %add_or_update_metadata (string %key) (bytes %value))
                                                         (or (string %remove_metadata)
                                                             (or (bytes %proof_of_event)
                                                                 (or (pair %mint (address %owner) (nat %amount) (nat %token_id))
                                                                     (pair %create_token (nat %token_id) (map %token_info string bytes))))))))))))))))
             (big_map %archives
                nat
                (or (unit %proposing) (or (unit %executed) (or (unit %rejected) (unit %expired)))))
             (big_map %voting_history
                (pair nat address)
                (pair (or %vote (unit %yes) (or (unit %no) (unit %abstention))) (nat %quantity)))
             (nat %token)
             (nat %supermajority)
             (nat %quorum)
             (int %voting_duration)
             (int %execution_duration))
          (pair %fa2
             (big_map %ledger (pair address nat) nat)
             (big_map %operators (pair address address) (set nat))
             (big_map %token_metadata nat (pair (nat %token_id) (map %token_info string bytes)))
             (big_map %metadata string bytes)
             (pair %extension
                (big_map %total_supply nat nat)
                (big_map %lock_table (pair nat address nat) nat)
                (set %lock_keys nat)))
          (big_map %metadata string bytes)) ;
  code { PUSH string "FA2_TOKEN_UNDEFINED" ;
         PUSH string "FA2_INSUFFICIENT_BALANCE" ;
         LAMBDA
           address
           unit
           { PUSH string "The sender can only manage operators for his own token" ;
             SENDER ;
             DIG 2 ;
             COMPARE ;
             EQ ;
             IF { DROP ; UNIT } { FAILWITH } } ;
         LAMBDA
           (pair (big_map (pair address nat) nat) address nat)
           nat
           { UNPAIR 3 ; DUG 2 ; PAIR ; GET ; IF_NONE { PUSH nat 0 } {} } ;
         LAMBDA
           (pair (big_map (pair address nat) nat) address nat nat)
           (big_map (pair address nat) nat)
           { UNPAIR 4 ; DIG 3 ; SOME ; DIG 3 ; DIG 3 ; PAIR ; UPDATE } ;
         LAMBDA
           (pair (big_map (pair nat address nat) nat) nat nat address)
           nat
           { UNPAIR 4 ;
             DIG 2 ;
             DIG 3 ;
             DIG 3 ;
             PAIR 3 ;
             GET ;
             IF_NONE { PUSH nat 0 } {} } ;
         LAMBDA
           (pair string (pair (big_map nat nat) nat))
           nat
           { UNPAIR ;
             SWAP ;
             UNPAIR ;
             SWAP ;
             GET ;
             IF_NONE { FAILWITH } { SWAP ; DROP } } ;
         DUP 7 ;
         APPLY ;
         LAMBDA
           (pair (pair (big_map (pair address nat) nat)
                       (big_map (pair address address) (set nat))
                       (big_map nat (pair nat (map string bytes)))
                       (big_map string bytes)
                       (pair (big_map nat nat) (big_map (pair nat address nat) nat) (set nat)))
                 (big_map nat nat)
                 (big_map (pair nat address nat) nat)
                 (set nat))
           (pair (big_map (pair address nat) nat)
                 (big_map (pair address address) (set nat))
                 (big_map nat (pair nat (map string bytes)))
                 (big_map string bytes)
                 (pair (big_map nat nat) (big_map (pair nat address nat) nat) (set nat)))
           { UNPAIR ; SWAP ; UPDATE 8 } ;
         LAMBDA
           (pair (lambda
                    (pair (pair (big_map (pair address nat) nat)
                                (big_map (pair address address) (set nat))
                                (big_map nat (pair nat (map string bytes)))
                                (big_map string bytes)
                                (pair (big_map nat nat) (big_map (pair nat address nat) nat) (set nat)))
                          (big_map nat nat)
                          (big_map (pair nat address nat) nat)
                          (set nat))
                    (pair (big_map (pair address nat) nat)
                          (big_map (pair address address) (set nat))
                          (big_map nat (pair nat (map string bytes)))
                          (big_map string bytes)
                          (pair (big_map nat nat) (big_map (pair nat address nat) nat) (set nat))))
                 (pair (pair (big_map (pair address nat) nat)
                             (big_map (pair address address) (set nat))
                             (big_map nat (pair nat (map string bytes)))
                             (big_map string bytes)
                             (pair (big_map nat nat) (big_map (pair nat address nat) nat) (set nat)))
                       (big_map (pair nat address nat) nat)))
           (pair (big_map (pair address nat) nat)
                 (big_map (pair address address) (set nat))
                 (big_map nat (pair nat (map string bytes)))
                 (big_map string bytes)
                 (pair (big_map nat nat) (big_map (pair nat address nat) nat) (set nat)))
           { UNPAIR ;
             SWAP ;
             UNPAIR ;
             DUP ;
             GET 8 ;
             DIG 2 ;
             UPDATE 3 ;
             SWAP ;
             PAIR ;
             EXEC } ;
         DUP 2 ;
         APPLY ;
         LAMBDA
           (pair (lambda
                    (pair (pair (big_map (pair address nat) nat)
                                (big_map (pair address address) (set nat))
                                (big_map nat (pair nat (map string bytes)))
                                (big_map string bytes)
                                (pair (big_map nat nat) (big_map (pair nat address nat) nat) (set nat)))
                          (big_map nat nat)
                          (big_map (pair nat address nat) nat)
                          (set nat))
                    (pair (big_map (pair address nat) nat)
                          (big_map (pair address address) (set nat))
                          (big_map nat (pair nat (map string bytes)))
                          (big_map string bytes)
                          (pair (big_map nat nat) (big_map (pair nat address nat) nat) (set nat))))
                 (pair (pair (big_map (pair address nat) nat)
                             (big_map (pair address address) (set nat))
                             (big_map nat (pair nat (map string bytes)))
                             (big_map string bytes)
                             (pair (big_map nat nat) (big_map (pair nat address nat) nat) (set nat)))
                       (set nat)))
           (pair (big_map (pair address nat) nat)
                 (big_map (pair address address) (set nat))
                 (big_map nat (pair nat (map string bytes)))
                 (big_map string bytes)
                 (pair (big_map nat nat) (big_map (pair nat address nat) nat) (set nat)))
           { UNPAIR ;
             SWAP ;
             UNPAIR ;
             DUP ;
             GET 8 ;
             DIG 2 ;
             UPDATE 4 ;
             SWAP ;
             PAIR ;
             EXEC } ;
         DUP 3 ;
         APPLY ;
         LAMBDA
           (pair (pair (or unit (or unit (or unit unit)))
                       (map (or unit (or unit unit)) nat)
                       (pair address timestamp)
                       (option (pair address timestamp))
                       (list (or (pair address mutez)
                                 (or (pair (option bytes) (lambda unit (list operation)))
                                     (or nat
                                         (or nat
                                             (or int
                                                 (or int
                                                     (or nat
                                                         (or (pair string bytes)
                                                             (or string (or bytes (or (pair address nat nat) (pair nat (map string bytes)))))))))))))))
                 nat
                 (big_map
                    nat
                    (pair (or unit (or unit (or unit unit)))
                          (map (or unit (or unit unit)) nat)
                          (pair address timestamp)
                          (option (pair address timestamp))
                          (list (or (pair address mutez)
                                    (or (pair (option bytes) (lambda unit (list operation)))
                                        (or nat
                                            (or nat
                                                (or int
                                                    (or int
                                                        (or nat
                                                            (or (pair string bytes)
                                                                (or string (or bytes (or (pair address nat nat) (pair nat (map string bytes))))))))))))))))
                 (big_map nat (or unit (or unit (or unit unit))))
                 (big_map (pair nat address) (pair (or unit (or unit unit)) nat))
                 nat
                 nat
                 nat
                 int
                 int)
           (pair nat
                 (big_map
                    nat
                    (pair (or unit (or unit (or unit unit)))
                          (map (or unit (or unit unit)) nat)
                          (pair address timestamp)
                          (option (pair address timestamp))
                          (list (or (pair address mutez)
                                    (or (pair (option bytes) (lambda unit (list operation)))
                                        (or nat
                                            (or nat
                                                (or int
                                                    (or int
                                                        (or nat
                                                            (or (pair string bytes)
                                                                (or string (or bytes (or (pair address nat nat) (pair nat (map string bytes))))))))))))))))
                 (big_map nat (or unit (or unit (or unit unit))))
                 (big_map (pair nat address) (pair (or unit (or unit unit)) nat))
                 nat
                 nat
                 nat
                 int
                 int)
           { UNPAIR ;
             PUSH nat 1 ;
             DUP 3 ;
             CAR ;
             ADD ;
             DUP 3 ;
             DIG 3 ;
             GET 3 ;
             DIG 3 ;
             DUP 4 ;
             SWAP ;
             SOME ;
             SWAP ;
             UPDATE ;
             UPDATE 3 ;
             SWAP ;
             UPDATE 1 } ;
         LAMBDA
           (pair nat
                 nat
                 (big_map
                    nat
                    (pair (or unit (or unit (or unit unit)))
                          (map (or unit (or unit unit)) nat)
                          (pair address timestamp)
                          (option (pair address timestamp))
                          (list (or (pair address mutez)
                                    (or (pair (option bytes) (lambda unit (list operation)))
                                        (or nat
                                            (or nat
                                                (or int
                                                    (or int
                                                        (or nat
                                                            (or (pair string bytes)
                                                                (or string (or bytes (or (pair address nat nat) (pair nat (map string bytes))))))))))))))))
                 (big_map nat (or unit (or unit (or unit unit))))
                 (big_map (pair nat address) (pair (or unit (or unit unit)) nat))
                 nat
                 nat
                 nat
                 int
                 int)
           (pair (or unit (or unit (or unit unit)))
                 (map (or unit (or unit unit)) nat)
                 (pair address timestamp)
                 (option (pair address timestamp))
                 (list (or (pair address mutez)
                           (or (pair (option bytes) (lambda unit (list operation)))
                               (or nat
                                   (or nat
                                       (or int
                                           (or int
                                               (or nat
                                                   (or (pair string bytes)
                                                       (or string (or bytes (or (pair address nat nat) (pair nat (map string bytes)))))))))))))))
           { UNPAIR ;
             DUP 2 ;
             GET 3 ;
             DUP 2 ;
             GET ;
             IF_NONE
               { SWAP ;
                 GET 5 ;
                 SWAP ;
                 GET ;
                 IF_NONE
                   { PUSH string "No proposal exists for this counter" ; FAILWITH }
                   { DROP ; PUSH string "This proposal has been resolved" ; FAILWITH } }
               { SWAP ; DIG 2 ; DROP 2 } } ;
         LAMBDA
           (pair (pair (or unit (or unit (or unit unit)))
                       (map (or unit (or unit unit)) nat)
                       (pair address timestamp)
                       (option (pair address timestamp))
                       (list (or (pair address mutez)
                                 (or (pair (option bytes) (lambda unit (list operation)))
                                     (or nat
                                         (or nat
                                             (or int
                                                 (or int
                                                     (or nat
                                                         (or (pair string bytes)
                                                             (or string (or bytes (or (pair address nat nat) (pair nat (map string bytes)))))))))))))))
                 (pair (or unit (or unit unit)) nat)
                 (option (pair (or unit (or unit unit)) nat)))
           (pair (or unit (or unit (or unit unit)))
                 (map (or unit (or unit unit)) nat)
                 (pair address timestamp)
                 (option (pair address timestamp))
                 (list (or (pair address mutez)
                           (or (pair (option bytes) (lambda unit (list operation)))
                               (or nat
                                   (or nat
                                       (or int
                                           (or int
                                               (or nat
                                                   (or (pair string bytes)
                                                       (or string (or bytes (or (pair address nat nat) (pair nat (map string bytes)))))))))))))))
           { UNPAIR 3 ;
             SWAP ;
             UNPAIR ;
             DUP 3 ;
             GET 3 ;
             DUP 2 ;
             GET ;
             IF_NONE
               { SWAP ; DROP ; PUSH string "Vote option not found" ; FAILWITH }
               { DUP 4 ; GET 3 ; DIG 3 ; DIG 2 ; ADD ; SOME ; DUP 3 ; UPDATE } ;
             DIG 3 ;
             IF_NONE
               { SWAP ; DROP }
               { UNPAIR ;
                 DIG 2 ;
                 SWAP ;
                 GET ;
                 IF_NONE
                   { DROP 2 ; PUSH string "Vote option not found" ; FAILWITH }
                   { DUP 4 ; GET 3 ; DUG 2 ; SUB ; ABS ; SOME ; DIG 2 ; UPDATE } } ;
             UPDATE 3 } ;
         LAMBDA
           (pair nat
                 (pair (or unit (or unit (or unit unit)))
                       (map (or unit (or unit unit)) nat)
                       (pair address timestamp)
                       (option (pair address timestamp))
                       (list (or (pair address mutez)
                                 (or (pair (option bytes) (lambda unit (list operation)))
                                     (or nat
                                         (or nat
                                             (or int
                                                 (or int
                                                     (or nat
                                                         (or (pair string bytes)
                                                             (or string (or bytes (or (pair address nat nat) (pair nat (map string bytes)))))))))))))))
                 nat
                 (big_map
                    nat
                    (pair (or unit (or unit (or unit unit)))
                          (map (or unit (or unit unit)) nat)
                          (pair address timestamp)
                          (option (pair address timestamp))
                          (list (or (pair address mutez)
                                    (or (pair (option bytes) (lambda unit (list operation)))
                                        (or nat
                                            (or nat
                                                (or int
                                                    (or int
                                                        (or nat
                                                            (or (pair string bytes)
                                                                (or string (or bytes (or (pair address nat nat) (pair nat (map string bytes))))))))))))))))
                 (big_map nat (or unit (or unit (or unit unit))))
                 (big_map (pair nat address) (pair (or unit (or unit unit)) nat))
                 nat
                 nat
                 nat
                 int
                 int)
           (pair nat
                 (big_map
                    nat
                    (pair (or unit (or unit (or unit unit)))
                          (map (or unit (or unit unit)) nat)
                          (pair address timestamp)
                          (option (pair address timestamp))
                          (list (or (pair address mutez)
                                    (or (pair (option bytes) (lambda unit (list operation)))
                                        (or nat
                                            (or nat
                                                (or int
                                                    (or int
                                                        (or nat
                                                            (or (pair string bytes)
                                                                (or string (or bytes (or (pair address nat nat) (pair nat (map string bytes))))))))))))))))
                 (big_map nat (or unit (or unit (or unit unit))))
                 (big_map (pair nat address) (pair (or unit (or unit unit)) nat))
                 nat
                 nat
                 nat
                 int
                 int)
           { UNPAIR 3 ;
             DUP 3 ;
             DIG 3 ;
             GET 3 ;
             DIG 3 ;
             SOME ;
             DIG 3 ;
             UPDATE ;
             UPDATE 3 } ;
         LAMBDA
           (pair nat
                 (or unit (or unit (or unit unit)))
                 nat
                 (big_map
                    nat
                    (pair (or unit (or unit (or unit unit)))
                          (map (or unit (or unit unit)) nat)
                          (pair address timestamp)
                          (option (pair address timestamp))
                          (list (or (pair address mutez)
                                    (or (pair (option bytes) (lambda unit (list operation)))
                                        (or nat
                                            (or nat
                                                (or int
                                                    (or int
                                                        (or nat
                                                            (or (pair string bytes)
                                                                (or string (or bytes (or (pair address nat nat) (pair nat (map string bytes))))))))))))))))
                 (big_map nat (or unit (or unit (or unit unit))))
                 (big_map (pair nat address) (pair (or unit (or unit unit)) nat))
                 nat
                 nat
                 nat
                 int
                 int)
           (pair nat
                 (big_map
                    nat
                    (pair (or unit (or unit (or unit unit)))
                          (map (or unit (or unit unit)) nat)
                          (pair address timestamp)
                          (option (pair address timestamp))
                          (list (or (pair address mutez)
                                    (or (pair (option bytes) (lambda unit (list operation)))
                                        (or nat
                                            (or nat
                                                (or int
                                                    (or int
                                                        (or nat
                                                            (or (pair string bytes)
                                                                (or string (or bytes (or (pair address nat nat) (pair nat (map string bytes))))))))))))))))
                 (big_map nat (or unit (or unit (or unit unit))))
                 (big_map (pair nat address) (pair (or unit (or unit unit)) nat))
                 nat
                 nat
                 nat
                 int
                 int)
           { UNPAIR 3 ;
             DUP 3 ;
             DUP 4 ;
             GET 3 ;
             DUP 3 ;
             NONE (pair (or unit (or unit (or unit unit)))
                        (map (or unit (or unit unit)) nat)
                        (pair address timestamp)
                        (option (pair address timestamp))
                        (list (or (pair address mutez)
                                  (or (pair (option bytes) (lambda unit (list operation)))
                                      (or nat
                                          (or nat
                                              (or int
                                                  (or int
                                                      (or nat
                                                          (or (pair string bytes)
                                                              (or string (or bytes (or (pair address nat nat) (pair nat (map string bytes))))))))))))))) ;
             SWAP ;
             UPDATE ;
             UPDATE 3 ;
             DIG 3 ;
             GET 5 ;
             DIG 3 ;
             DIG 3 ;
             SWAP ;
             SOME ;
             SWAP ;
             UPDATE ;
             UPDATE 5 } ;
         LAMBDA
           mutez
           unit
           { PUSH mutez 0 ;
             SWAP ;
             COMPARE ;
             EQ ;
             IF { UNIT }
                { PUSH string "You must not send tez to the smart contract" ; FAILWITH } } ;
         LAMBDA
           (or (pair address mutez)
               (or (pair (option bytes) (lambda unit (list operation)))
                   (or nat
                       (or nat
                           (or int
                               (or int
                                   (or nat
                                       (or (pair string bytes)
                                           (or string (or bytes (or (pair address nat nat) (pair nat (map string bytes)))))))))))))
           unit
           { IF_LEFT
               { PUSH mutez 0 ;
                 SWAP ;
                 CDR ;
                 COMPARE ;
                 EQ ;
                 NOT ;
                 IF { UNIT } { PUSH string "Amount should be greater than zero" ; FAILWITH } }
               { IF_LEFT
                   { DROP ; UNIT }
                   { IF_LEFT
                       { PUSH nat 0 ;
                         SWAP ;
                         COMPARE ;
                         GT ;
                         IF { UNIT } { PUSH string "The quorum must be >= 1" ; FAILWITH } }
                       { IF_LEFT
                           { PUSH nat 0 ;
                             SWAP ;
                             COMPARE ;
                             GT ;
                             IF { UNIT } { PUSH string "The supermajority must be >= 1" ; FAILWITH } }
                           { IF_LEFT
                               { PUSH int 0 ;
                                 SWAP ;
                                 COMPARE ;
                                 GT ;
                                 IF { UNIT } { PUSH string "The voting period must be >= 1" ; FAILWITH } }
                               { IF_LEFT
                                   { PUSH int 0 ;
                                     SWAP ;
                                     COMPARE ;
                                     GT ;
                                     IF { UNIT } { PUSH string "The execution period must be >= 1" ; FAILWITH } }
                                   { IF_LEFT
                                       { DROP }
                                       { IF_LEFT
                                           { DROP }
                                           { IF_LEFT
                                               { DROP }
                                               { IF_LEFT { DROP } { IF_LEFT { DROP } { DROP } } } } } ;
                                     UNIT } } } } } } } ;
         LAMBDA
           (pair (list (or (pair address mutez)
                           (or (pair (option bytes) (lambda unit (list operation)))
                               (or nat
                                   (or nat
                                       (or int
                                           (or int
                                               (or nat
                                                   (or (pair string bytes)
                                                       (or string (or bytes (or (pair address nat nat) (pair nat (map string bytes))))))))))))))
                 (list (or (pair address mutez)
                           (or (pair (option bytes) (lambda unit (list operation)))
                               (or nat
                                   (or nat
                                       (or int
                                           (or int
                                               (or nat
                                                   (or (pair string bytes)
                                                       (or string (or bytes (or (pair address nat nat) (pair nat (map string bytes)))))))))))))))
           unit
           { UNPAIR ;
             PACK ;
             SWAP ;
             PACK ;
             SWAP ;
             COMPARE ;
             EQ ;
             IF { UNIT } { PUSH string "The proposal content doesn't match" ; FAILWITH } } ;
         LAMBDA
           (pair string
                 (pair nat
                       address
                       (big_map (pair address nat) nat)
                       (big_map (pair address address) (set nat))
                       (big_map nat (pair nat (map string bytes)))
                       (big_map string bytes)
                       (pair (big_map nat nat) (big_map (pair nat address nat) nat) (set nat))))
           nat
           { UNPAIR ;
             SWAP ;
             UNPAIR 3 ;
             DUP 3 ;
             GET 5 ;
             DUP 2 ;
             GET ;
             IF_NONE { DIG 3 ; FAILWITH } { DIG 4 ; DROP 2 } ;
             DIG 2 ;
             CAR ;
             SWAP ;
             DIG 2 ;
             PAIR ;
             GET ;
             IF_NONE { PUSH nat 0 } {} ;
             PUSH nat 0 ;
             DUP 2 ;
             COMPARE ;
             LE ;
             IF { DROP ; PUSH string "Balance is non-positive" ; FAILWITH } {} } ;
         DUP 19 ;
         APPLY ;
         LAMBDA
           (pair (pair (lambda
                          (pair (pair (big_map (pair address nat) nat)
                                      (big_map (pair address address) (set nat))
                                      (big_map nat (pair nat (map string bytes)))
                                      (big_map string bytes)
                                      (pair (big_map nat nat) (big_map (pair nat address nat) nat) (set nat)))
                                (big_map (pair nat address nat) nat))
                          (pair (big_map (pair address nat) nat)
                                (big_map (pair address address) (set nat))
                                (big_map nat (pair nat (map string bytes)))
                                (big_map string bytes)
                                (pair (big_map nat nat) (big_map (pair nat address nat) nat) (set nat))))
                       (lambda (pair (big_map (pair nat address nat) nat) nat nat address) nat))
                 (pair (pair (big_map (pair address nat) nat)
                             (big_map (pair address address) (set nat))
                             (big_map nat (pair nat (map string bytes)))
                             (big_map string bytes)
                             (pair (big_map nat nat) (big_map (pair nat address nat) nat) (set nat)))
                       nat
                       nat
                       address
                       nat))
           (pair (big_map (pair address nat) nat)
                 (big_map (pair address address) (set nat))
                 (big_map nat (pair nat (map string bytes)))
                 (big_map string bytes)
                 (pair (big_map nat nat) (big_map (pair nat address nat) nat) (set nat)))
           { UNPAIR ;
             UNPAIR ;
             DIG 2 ;
             UNPAIR 5 ;
             DUP ;
             GET 8 ;
             GET 3 ;
             DUP 5 ;
             DUP 5 ;
             DUP 5 ;
             DUP 4 ;
             PAIR 4 ;
             DIG 8 ;
             SWAP ;
             EXEC ;
             DIG 6 ;
             ADD ;
             SOME ;
             DIG 4 ;
             DIG 5 ;
             DIG 5 ;
             PAIR 3 ;
             UPDATE ;
             SWAP ;
             PAIR ;
             EXEC } ;
         DUP 15 ;
         DUP 13 ;
         PAIR ;
         APPLY ;
         DIG 20 ;
         UNPAIR ;
         IF_LEFT
           { DIG 2 ;
             DIG 3 ;
             DIG 4 ;
             DIG 5 ;
             DIG 6 ;
             DIG 7 ;
             DIG 8 ;
             DIG 9 ;
             DIG 10 ;
             DIG 11 ;
             DIG 12 ;
             DIG 13 ;
             DIG 14 ;
             DIG 15 ;
             DIG 16 ;
             DIG 17 ;
             DIG 18 ;
             DIG 20 ;
             DIG 21 ;
             DROP 19 ;
             DUP 2 ;
             GET 3 ;
             DUP ;
             GET 3 ;
             DIG 2 ;
             ITER { IF_LEFT
                      { UNPAIR 3 ;
                        DUP 2 ;
                        DUP 2 ;
                        COMPARE ;
                        EQ ;
                        IF { DROP 3 }
                           { DUP ;
                             DUP 8 ;
                             SWAP ;
                             EXEC ;
                             DROP ;
                             DUP 4 ;
                             DIG 4 ;
                             DUP 4 ;
                             DUP 4 ;
                             PAIR ;
                             GET ;
                             IF_NONE { EMPTY_SET nat } {} ;
                             DIG 4 ;
                             PUSH bool True ;
                             SWAP ;
                             UPDATE ;
                             SOME ;
                             DIG 3 ;
                             DIG 3 ;
                             PAIR ;
                             UPDATE } }
                      { UNPAIR 3 ;
                        DUP 2 ;
                        DUP 2 ;
                        COMPARE ;
                        EQ ;
                        IF { DROP 3 }
                           { DUP ;
                             DUP 8 ;
                             SWAP ;
                             EXEC ;
                             DROP ;
                             DUP 4 ;
                             DIG 4 ;
                             DUP 4 ;
                             DUP 4 ;
                             PAIR ;
                             GET ;
                             IF_NONE
                               { DIG 3 ; DROP ; NONE (set nat) }
                               { DIG 4 ;
                                 PUSH bool False ;
                                 SWAP ;
                                 UPDATE ;
                                 PUSH nat 0 ;
                                 DUP 2 ;
                                 SIZE ;
                                 COMPARE ;
                                 EQ ;
                                 IF { DROP ; NONE (set nat) } { SOME } } ;
                             DIG 3 ;
                             DIG 3 ;
                             PAIR ;
                             UPDATE } } } ;
             DIG 3 ;
             DROP ;
             UPDATE 3 ;
             UPDATE 3 ;
             NIL operation }
           { DIG 19 ;
             DROP ;
             IF_LEFT
               { DIG 2 ;
                 DIG 3 ;
                 DIG 4 ;
                 DIG 5 ;
                 DIG 6 ;
                 DIG 7 ;
                 DIG 8 ;
                 DIG 9 ;
                 DIG 10 ;
                 DIG 11 ;
                 DIG 12 ;
                 DIG 13 ;
                 DIG 14 ;
                 DIG 15 ;
                 DIG 16 ;
                 DIG 17 ;
                 DIG 19 ;
                 DROP 17 ;
                 DUP 2 ;
                 GET 3 ;
                 SWAP ;
                 UNPAIR ;
                 MAP { DUP ;
                       UNPAIR ;
                       DUP 5 ;
                       GET 5 ;
                       DUP 3 ;
                       GET ;
                       IF_NONE { DUP 8 ; FAILWITH } { DROP } ;
                       DUP 5 ;
                       CAR ;
                       PAIR 3 ;
                       DUP 6 ;
                       SWAP ;
                       EXEC ;
                       SWAP ;
                       PAIR } ;
                 DIG 4 ;
                 DIG 5 ;
                 DROP 2 ;
                 SWAP ;
                 PUSH mutez 0 ;
                 DIG 2 ;
                 TRANSFER_TOKENS ;
                 SWAP ;
                 NIL operation ;
                 DIG 2 ;
                 CONS ;
                 DUG 2 ;
                 UPDATE 3 ;
                 SWAP }
               { IF_LEFT
                   { DIG 2 ;
                     DIG 3 ;
                     DIG 4 ;
                     DIG 5 ;
                     DIG 6 ;
                     DIG 7 ;
                     DIG 8 ;
                     DIG 9 ;
                     DIG 10 ;
                     DIG 11 ;
                     DIG 12 ;
                     DIG 13 ;
                     DIG 14 ;
                     DIG 15 ;
                     DIG 16 ;
                     DROP 15 ;
                     DUP 2 ;
                     GET 3 ;
                     DUP ;
                     CAR ;
                     DIG 2 ;
                     ITER { UNPAIR ;
                            DUG 2 ;
                            ITER { UNPAIR 3 ;
                                   DUP 6 ;
                                   GET 5 ;
                                   DUP 3 ;
                                   GET ;
                                   IF_NONE { DUP 11 ; FAILWITH } { DROP } ;
                                   SENDER ;
                                   DUP 6 ;
                                   DUP 2 ;
                                   COMPARE ;
                                   EQ ;
                                   IF { DROP }
                                      { DUP 7 ;
                                        GET 3 ;
                                        SWAP ;
                                        DUP 7 ;
                                        PAIR ;
                                        GET ;
                                        IF_NONE { EMPTY_SET nat } {} ;
                                        DUP 3 ;
                                        MEM ;
                                        IF {} { PUSH string "FA2_NOT_OPERATOR" ; FAILWITH } } ;
                                   DUP 2 ;
                                   DUP 6 ;
                                   DUP 6 ;
                                   PAIR 3 ;
                                   DUP 10 ;
                                   SWAP ;
                                   EXEC ;
                                   PUSH nat 0 ;
                                   DUP 8 ;
                                   GET 8 ;
                                   GET 4 ;
                                   ITER { SWAP ;
                                          DUP 9 ;
                                          GET 8 ;
                                          GET 3 ;
                                          DUP 6 ;
                                          DUP 10 ;
                                          DIG 3 ;
                                          PAIR 3 ;
                                          GET ;
                                          IF_NONE
                                            {}
                                            { DUP 2 ; DUP 2 ; COMPARE ; GT ; IF { SWAP ; DROP } { DROP } } } ;
                                   DUP 12 ;
                                   PUSH int 0 ;
                                   DUP 3 ;
                                   DUP 5 ;
                                   SUB ;
                                   COMPARE ;
                                   GE ;
                                   IF { DROP } { FAILWITH } ;
                                   DUP 12 ;
                                   DUP 6 ;
                                   DIG 2 ;
                                   DUP 4 ;
                                   SUB ;
                                   ABS ;
                                   COMPARE ;
                                   GE ;
                                   IF { DROP } { FAILWITH } ;
                                   DUP 4 ;
                                   SWAP ;
                                   SUB ;
                                   ABS ;
                                   DUP 3 ;
                                   DUP 7 ;
                                   DIG 6 ;
                                   PAIR 4 ;
                                   DUP 8 ;
                                   SWAP ;
                                   EXEC ;
                                   DUP 3 ;
                                   DUP 3 ;
                                   DUP 3 ;
                                   PAIR 3 ;
                                   DUP 10 ;
                                   SWAP ;
                                   EXEC ;
                                   DIG 4 ;
                                   ADD ;
                                   DUG 3 ;
                                   PAIR 4 ;
                                   DUP 5 ;
                                   SWAP ;
                                   EXEC } ;
                            SWAP ;
                            DROP } ;
                     DIG 3 ;
                     DIG 4 ;
                     DIG 5 ;
                     DIG 6 ;
                     DROP 4 ;
                     UPDATE 1 ;
                     UPDATE 3 ;
                     NIL operation }
                   { DIG 17 ;
                     DIG 18 ;
                     DIG 19 ;
                     DROP 3 ;
                     IF_LEFT
                       { DIG 2 ;
                         DIG 3 ;
                         DIG 4 ;
                         DIG 5 ;
                         DIG 6 ;
                         DIG 7 ;
                         DIG 8 ;
                         DIG 9 ;
                         DIG 10 ;
                         DIG 11 ;
                         DIG 12 ;
                         DIG 13 ;
                         DIG 14 ;
                         DIG 15 ;
                         DIG 16 ;
                         DIG 17 ;
                         DROP 17 ;
                         AMOUNT ;
                         SENDER ;
                         PAIR ;
                         EMIT %receiving_tez (pair (address %from) (mutez %amount)) ;
                         SWAP ;
                         NIL operation }
                       { IF_LEFT
                           { DIG 2 ;
                             DIG 4 ;
                             DIG 7 ;
                             DIG 8 ;
                             DIG 9 ;
                             DIG 10 ;
                             DIG 13 ;
                             DIG 14 ;
                             DIG 15 ;
                             DIG 16 ;
                             DIG 17 ;
                             DROP 11 ;
                             SWAP ;
                             UNPAIR 3 ;
                             DUP ;
                             GET 9 ;
                             DUP 3 ;
                             SENDER ;
                             DIG 2 ;
                             PAIR 3 ;
                             DIG 5 ;
                             SWAP ;
                             EXEC ;
                             DROP ;
                             AMOUNT ;
                             DIG 6 ;
                             SWAP ;
                             EXEC ;
                             DROP ;
                             PUSH nat 0 ;
                             DUP 5 ;
                             SIZE ;
                             COMPARE ;
                             GT ;
                             IF {} { PUSH string "There is no content in proposal" ; FAILWITH } ;
                             DUP 4 ;
                             ITER { DUP 6 ; SWAP ; EXEC ; DROP } ;
                             DIG 4 ;
                             DROP ;
                             EMPTY_MAP (or unit (or unit unit)) nat ;
                             PUSH nat 0 ;
                             UNIT ;
                             RIGHT unit ;
                             RIGHT unit ;
                             SWAP ;
                             SOME ;
                             SWAP ;
                             UPDATE ;
                             PUSH nat 0 ;
                             UNIT ;
                             LEFT unit ;
                             RIGHT unit ;
                             SWAP ;
                             SOME ;
                             SWAP ;
                             UPDATE ;
                             PUSH nat 0 ;
                             UNIT ;
                             LEFT (or unit unit) ;
                             SWAP ;
                             SOME ;
                             SWAP ;
                             UPDATE ;
                             DIG 4 ;
                             NONE (pair address timestamp) ;
                             NOW ;
                             SENDER ;
                             PAIR ;
                             DIG 3 ;
                             UNIT ;
                             LEFT (or unit (or unit unit)) ;
                             PAIR 5 ;
                             PAIR ;
                             DIG 3 ;
                             SWAP ;
                             EXEC ;
                             DUP ;
                             CAR ;
                             DUP ;
                             EMIT %create_proposal nat ;
                             DUP 4 ;
                             GET 8 ;
                             GET 4 ;
                             DUP ;
                             DUP 4 ;
                             MEM ;
                             NOT ;
                             IF {} { PUSH string "The given lock key does exist" ; FAILWITH } ;
                             DIG 2 ;
                             PUSH bool True ;
                             SWAP ;
                             UPDATE ;
                             DIG 3 ;
                             PAIR ;
                             DIG 4 ;
                             SWAP ;
                             EXEC ;
                             DIG 3 ;
                             SWAP ;
                             DIG 3 ;
                             PAIR 3 ;
                             NIL operation }
                           { IF_LEFT
                               { DIG 5 ;
                                 DIG 7 ;
                                 DIG 11 ;
                                 DIG 12 ;
                                 DIG 14 ;
                                 DIG 15 ;
                                 DIG 17 ;
                                 DROP 7 ;
                                 UNPAIR 3 ;
                                 DIG 3 ;
                                 UNPAIR 3 ;
                                 DUP ;
                                 GET 9 ;
                                 SENDER ;
                                 DUP 4 ;
                                 DUP 2 ;
                                 DUP 4 ;
                                 PAIR 3 ;
                                 DIG 10 ;
                                 SWAP ;
                                 EXEC ;
                                 AMOUNT ;
                                 DIG 12 ;
                                 SWAP ;
                                 EXEC ;
                                 DROP ;
                                 DUP 9 ;
                                 CDR ;
                                 DUP ;
                                 DIG 2 ;
                                 COMPARE ;
                                 LT ;
                                 IF { PUSH string "Error: tokens are less than votes" ; FAILWITH } {} ;
                                 DUP 4 ;
                                 DUP 8 ;
                                 PAIR ;
                                 DIG 14 ;
                                 SWAP ;
                                 EXEC ;
                                 PUSH string "The proposal has passed its voting time" ;
                                 NOW ;
                                 DUP 7 ;
                                 GET 15 ;
                                 DUP 4 ;
                                 GET 5 ;
                                 CDR ;
                                 ADD ;
                                 COMPARE ;
                                 GT ;
                                 IF { DROP } { FAILWITH } ;
                                 DUP ;
                                 GET 8 ;
                                 DIG 9 ;
                                 PAIR ;
                                 DIG 11 ;
                                 SWAP ;
                                 EXEC ;
                                 DROP ;
                                 DUP 5 ;
                                 GET 7 ;
                                 DUP 4 ;
                                 DUP 10 ;
                                 PAIR ;
                                 GET ;
                                 IF_NONE { PUSH bool False } { DROP ; PUSH bool True } ;
                                 IF { DUP 5 ;
                                      GET 7 ;
                                      DUP 4 ;
                                      DUP 10 ;
                                      PAIR ;
                                      GET ;
                                      IF_NONE { PUSH string "no history" ; FAILWITH } {} ;
                                      DUP ;
                                      CDR ;
                                      SWAP ;
                                      SOME ;
                                      DUP 11 ;
                                      DIG 3 ;
                                      PAIR 3 ;
                                      DIG 12 ;
                                      SWAP ;
                                      EXEC ;
                                      DUP 7 ;
                                      GET 8 ;
                                      GET 3 ;
                                      DUP 5 ;
                                      DUP 7 ;
                                      DUP 12 ;
                                      DUP 4 ;
                                      PAIR 4 ;
                                      DIG 15 ;
                                      SWAP ;
                                      EXEC ;
                                      DIG 3 ;
                                      SWAP ;
                                      SUB ;
                                      ABS ;
                                      SOME ;
                                      DUP 6 ;
                                      DUP 6 ;
                                      DUP 12 ;
                                      PAIR 3 ;
                                      UPDATE ;
                                      DIG 6 ;
                                      PAIR ;
                                      DIG 11 ;
                                      SWAP ;
                                      EXEC ;
                                      DIG 2 ;
                                      DUP 4 ;
                                      DIG 5 ;
                                      DUP 9 ;
                                      DIG 4 ;
                                      PAIR 5 ;
                                      DIG 7 ;
                                      SWAP ;
                                      EXEC ;
                                      SWAP }
                                    { DIG 12 ;
                                      DIG 13 ;
                                      DROP 2 ;
                                      SWAP ;
                                      DUP 3 ;
                                      DIG 4 ;
                                      DUP 9 ;
                                      DIG 7 ;
                                      PAIR 5 ;
                                      DIG 7 ;
                                      SWAP ;
                                      EXEC ;
                                      NONE (pair (or unit (or unit unit)) nat) ;
                                      DUP 8 ;
                                      DIG 3 ;
                                      PAIR 3 ;
                                      DIG 8 ;
                                      SWAP ;
                                      EXEC } ;
                                 SWAP ;
                                 DUP 4 ;
                                 DIG 4 ;
                                 GET 7 ;
                                 DIG 7 ;
                                 SOME ;
                                 DUP 6 ;
                                 DUP 9 ;
                                 PAIR ;
                                 UPDATE ;
                                 UPDATE 7 ;
                                 DIG 2 ;
                                 DUP 6 ;
                                 PAIR 3 ;
                                 DIG 5 ;
                                 SWAP ;
                                 EXEC ;
                                 DIG 2 ;
                                 DIG 4 ;
                                 PAIR ;
                                 EMIT %sign_proposal (pair (nat %proposal_id) (address %signer)) ;
                                 DUG 3 ;
                                 PAIR 3 ;
                                 NIL operation }
                               { DIG 2 ;
                                 DIG 9 ;
                                 DIG 13 ;
                                 DIG 16 ;
                                 DROP 4 ;
                                 IF_LEFT
                                   { DIG 4 ;
                                     DIG 9 ;
                                     DROP 2 ;
                                     UNPAIR ;
                                     DIG 2 ;
                                     UNPAIR 3 ;
                                     DUP ;
                                     GET 9 ;
                                     DUP 3 ;
                                     SENDER ;
                                     DUP 3 ;
                                     PAIR 3 ;
                                     DIG 7 ;
                                     SWAP ;
                                     EXEC ;
                                     DROP ;
                                     AMOUNT ;
                                     DIG 8 ;
                                     SWAP ;
                                     EXEC ;
                                     DROP ;
                                     DUP 2 ;
                                     DUP 6 ;
                                     PAIR ;
                                     DIG 10 ;
                                     SWAP ;
                                     EXEC ;
                                     DUP ;
                                     GET 8 ;
                                     DIG 7 ;
                                     PAIR ;
                                     DIG 7 ;
                                     SWAP ;
                                     EXEC ;
                                     DROP ;
                                     PUSH string "Current period is for voting" ;
                                     NOW ;
                                     DUP 5 ;
                                     GET 15 ;
                                     DUP 4 ;
                                     GET 5 ;
                                     CDR ;
                                     ADD ;
                                     COMPARE ;
                                     LE ;
                                     IF { DROP } { FAILWITH } ;
                                     DUP 3 ;
                                     GET 16 ;
                                     DUP 4 ;
                                     GET 15 ;
                                     DUP 3 ;
                                     GET 5 ;
                                     CDR ;
                                     ADD ;
                                     ADD ;
                                     DIG 2 ;
                                     DUP 5 ;
                                     GET 8 ;
                                     CAR ;
                                     PAIR ;
                                     DUP 12 ;
                                     SWAP ;
                                     EXEC ;
                                     NOW ;
                                     DIG 2 ;
                                     COMPARE ;
                                     LT ;
                                     IF { SWAP ;
                                          UNIT ;
                                          RIGHT unit ;
                                          RIGHT unit ;
                                          RIGHT unit ;
                                          UPDATE 1 ;
                                          NOW ;
                                          SENDER ;
                                          PAIR ;
                                          SOME ;
                                          UPDATE 7 }
                                        { SWAP } ;
                                     UNIT ;
                                     RIGHT unit ;
                                     RIGHT unit ;
                                     RIGHT unit ;
                                     DUP 2 ;
                                     CAR ;
                                     COMPARE ;
                                     EQ ;
                                     IF { SWAP ; DROP }
                                        { DUP ;
                                          GET 3 ;
                                          DUP ;
                                          UNIT ;
                                          LEFT (or unit unit) ;
                                          GET ;
                                          IF_NONE
                                            { PUSH string "No positive option, it should not happen" ; FAILWITH }
                                            {} ;
                                          SWAP ;
                                          UNIT ;
                                          LEFT unit ;
                                          RIGHT unit ;
                                          GET ;
                                          IF_NONE
                                            { PUSH string "No negative option, it should not happen" ; FAILWITH }
                                            {} ;
                                          DUP 2 ;
                                          ADD ;
                                          DUP 5 ;
                                          GET 11 ;
                                          SWAP ;
                                          MUL ;
                                          PUSH nat 100 ;
                                          DIG 2 ;
                                          MUL ;
                                          COMPARE ;
                                          GE ;
                                          PUSH nat 0 ;
                                          DUP 3 ;
                                          GET 3 ;
                                          ITER { CDR ; ADD } ;
                                          DUP 5 ;
                                          GET 13 ;
                                          DIG 4 ;
                                          MUL ;
                                          PUSH nat 100 ;
                                          DIG 2 ;
                                          MUL ;
                                          COMPARE ;
                                          GE ;
                                          AND ;
                                          IF { UNIT ; LEFT (or unit unit) } { UNIT ; LEFT unit ; RIGHT unit } ;
                                          RIGHT unit ;
                                          UPDATE 1 ;
                                          NOW ;
                                          SENDER ;
                                          PAIR ;
                                          SOME ;
                                          UPDATE 7 } ;
                                     PUSH string "Can not resolve proposal" ;
                                     UNIT ;
                                     LEFT (or unit (or unit unit)) ;
                                     DUP 3 ;
                                     CAR ;
                                     COMPARE ;
                                     EQ ;
                                     NOT ;
                                     IF { DROP } { FAILWITH } ;
                                     SWAP ;
                                     DUP 2 ;
                                     DUP 6 ;
                                     PAIR 3 ;
                                     DIG 6 ;
                                     SWAP ;
                                     EXEC ;
                                     DUP 3 ;
                                     GET 8 ;
                                     GET 4 ;
                                     DUP ;
                                     DUP 7 ;
                                     MEM ;
                                     IF {} { PUSH string "The given lock key does not exist" ; FAILWITH } ;
                                     DUP 6 ;
                                     PUSH bool False ;
                                     SWAP ;
                                     UPDATE ;
                                     DIG 3 ;
                                     PAIR ;
                                     DIG 6 ;
                                     SWAP ;
                                     EXEC ;
                                     DIG 3 ;
                                     SWAP ;
                                     DIG 2 ;
                                     PAIR 3 ;
                                     DUP ;
                                     CAR ;
                                     DUP 3 ;
                                     CAR ;
                                     IF_LEFT
                                       { SWAP ; DIG 5 ; DIG 6 ; DIG 7 ; DIG 8 ; DROP 6 ; NIL operation }
                                       { IF_LEFT
                                           { DROP 2 ;
                                             NIL operation ;
                                             PAIR ;
                                             DUP 2 ;
                                             GET 8 ;
                                             ITER { SWAP ;
                                                    UNPAIR ;
                                                    DUP 2 ;
                                                    UNPAIR 3 ;
                                                    DIG 5 ;
                                                    IF_LEFT
                                                      { SWAP ;
                                                        DIG 2 ;
                                                        DIG 3 ;
                                                        DROP 3 ;
                                                        DIG 2 ;
                                                        NIL operation ;
                                                        DIG 2 ;
                                                        UNPAIR ;
                                                        CONTRACT unit ;
                                                        IF_NONE { PUSH string "Unknown contract" ; FAILWITH } {} ;
                                                        SWAP ;
                                                        UNIT ;
                                                        TRANSFER_TOKENS ;
                                                        CONS }
                                                      { IF_LEFT
                                                          { SWAP ; DIG 2 ; DIG 3 ; DROP 3 ; DIG 2 ; UNIT ; DIG 2 ; CDR ; SWAP ; EXEC }
                                                          { IF_LEFT
                                                              { DIG 2 ;
                                                                DIG 3 ;
                                                                DROP 2 ;
                                                                DIG 3 ;
                                                                DUG 2 ;
                                                                UPDATE 13 ;
                                                                UPDATE 1 ;
                                                                NIL operation }
                                                              { IF_LEFT
                                                                  { DIG 2 ;
                                                                    DIG 3 ;
                                                                    DROP 2 ;
                                                                    DIG 3 ;
                                                                    DUG 2 ;
                                                                    UPDATE 11 ;
                                                                    UPDATE 1 ;
                                                                    NIL operation }
                                                                  { IF_LEFT
                                                                      { DIG 2 ;
                                                                        DIG 3 ;
                                                                        DROP 2 ;
                                                                        DIG 3 ;
                                                                        DUG 2 ;
                                                                        UPDATE 15 ;
                                                                        UPDATE 1 ;
                                                                        NIL operation }
                                                                      { IF_LEFT
                                                                          { DIG 2 ;
                                                                            DIG 3 ;
                                                                            DROP 2 ;
                                                                            DIG 3 ;
                                                                            DUG 2 ;
                                                                            UPDATE 16 ;
                                                                            UPDATE 1 ;
                                                                            NIL operation }
                                                                          { IF_LEFT
                                                                              { DIG 2 ;
                                                                                DIG 3 ;
                                                                                DROP 2 ;
                                                                                DIG 3 ;
                                                                                DUG 2 ;
                                                                                UPDATE 9 ;
                                                                                UPDATE 1 ;
                                                                                NIL operation }
                                                                              { SWAP ;
                                                                                DROP ;
                                                                                IF_LEFT
                                                                                  { SWAP ;
                                                                                    DROP ;
                                                                                    UNPAIR ;
                                                                                    DIG 4 ;
                                                                                    DIG 3 ;
                                                                                    DIG 3 ;
                                                                                    SOME ;
                                                                                    DIG 3 ;
                                                                                    UPDATE ;
                                                                                    UPDATE 4 ;
                                                                                    NIL operation }
                                                                                  { IF_LEFT
                                                                                      { SWAP ;
                                                                                        DROP ;
                                                                                        DIG 3 ;
                                                                                        DUG 2 ;
                                                                                        NONE bytes ;
                                                                                        SWAP ;
                                                                                        UPDATE ;
                                                                                        UPDATE 4 ;
                                                                                        NIL operation }
                                                                                      { DIG 2 ;
                                                                                        DROP ;
                                                                                        IF_LEFT
                                                                                          { SWAP ;
                                                                                            DROP ;
                                                                                            EMIT %proof_of_event bytes ;
                                                                                            DIG 2 ;
                                                                                            NIL operation ;
                                                                                            DIG 2 ;
                                                                                            CONS }
                                                                                          { IF_LEFT
                                                                                              { DIG 3 ;
                                                                                                SWAP ;
                                                                                                UNPAIR 3 ;
                                                                                                DUP 5 ;
                                                                                                GET 5 ;
                                                                                                DUP 4 ;
                                                                                                GET ;
                                                                                                IF_NONE { DUP 12 ; FAILWITH } { DROP } ;
                                                                                                DUP 5 ;
                                                                                                CAR ;
                                                                                                DUP 4 ;
                                                                                                DUP 3 ;
                                                                                                PAIR ;
                                                                                                GET ;
                                                                                                IF_NONE { PUSH bool True } { DROP ; PUSH bool False } ;
                                                                                                IF {} { PUSH string "failed assertion" ; FAILWITH } ;
                                                                                                DUP 5 ;
                                                                                                DIG 5 ;
                                                                                                CAR ;
                                                                                                DUP 4 ;
                                                                                                SOME ;
                                                                                                DUP 6 ;
                                                                                                DIG 4 ;
                                                                                                PAIR ;
                                                                                                UPDATE ;
                                                                                                UPDATE 1 ;
                                                                                                DUP ;
                                                                                                GET 8 ;
                                                                                                CAR ;
                                                                                                DUP ;
                                                                                                DUP 5 ;
                                                                                                GET ;
                                                                                                IF_NONE
                                                                                                  { DIG 2 ; DIG 3 ; SWAP ; SOME ; SWAP ; UPDATE }
                                                                                                  { DROP ;
                                                                                                    DUP 4 ;
                                                                                                    DUP 2 ;
                                                                                                    PAIR ;
                                                                                                    DUP 12 ;
                                                                                                    SWAP ;
                                                                                                    EXEC ;
                                                                                                    DIG 3 ;
                                                                                                    ADD ;
                                                                                                    SOME ;
                                                                                                    DIG 3 ;
                                                                                                    UPDATE } ;
                                                                                                DUP 2 ;
                                                                                                GET 8 ;
                                                                                                SWAP ;
                                                                                                UPDATE 1 ;
                                                                                                SWAP ;
                                                                                                PAIR ;
                                                                                                DUP 7 ;
                                                                                                SWAP ;
                                                                                                EXEC ;
                                                                                                UPDATE 3 }
                                                                                              { DIG 3 ;
                                                                                                DUP 3 ;
                                                                                                GET 5 ;
                                                                                                DUP 3 ;
                                                                                                CAR ;
                                                                                                MEM ;
                                                                                                NOT ;
                                                                                                IF {} { PUSH string "Token is already exist" ; FAILWITH } ;
                                                                                                DUP 3 ;
                                                                                                DIG 3 ;
                                                                                                GET 5 ;
                                                                                                DUP 4 ;
                                                                                                DIG 4 ;
                                                                                                CAR ;
                                                                                                SWAP ;
                                                                                                SOME ;
                                                                                                SWAP ;
                                                                                                UPDATE ;
                                                                                                UPDATE 5 ;
                                                                                                UPDATE 3 } ;
                                                                                            NIL operation } } } } } } } } } } ;
                                                    DIG 2 ;
                                                    NIL operation ;
                                                    SWAP ;
                                                    ITER { CONS } ;
                                                    ITER { CONS } ;
                                                    PAIR } ;
                                             DIG 4 ;
                                             DIG 5 ;
                                             DIG 6 ;
                                             DROP 3 ;
                                             UNPAIR ;
                                             SWAP ;
                                             UNPAIR 3 ;
                                             UNIT ;
                                             LEFT (or unit unit) ;
                                             RIGHT unit ;
                                             DUP 7 ;
                                             PAIR 3 ;
                                             DIG 6 ;
                                             SWAP ;
                                             EXEC ;
                                             PAIR 3 ;
                                             SWAP }
                                           { DIG 6 ;
                                             DIG 7 ;
                                             DIG 8 ;
                                             DROP 3 ;
                                             IF_LEFT
                                               { DROP ;
                                                 UNIT ;
                                                 LEFT unit ;
                                                 RIGHT unit ;
                                                 RIGHT unit ;
                                                 DUP 5 ;
                                                 PAIR 3 ;
                                                 DIG 4 ;
                                                 SWAP ;
                                                 EXEC ;
                                                 UPDATE 1 }
                                               { DROP ;
                                                 UNIT ;
                                                 RIGHT unit ;
                                                 RIGHT unit ;
                                                 RIGHT unit ;
                                                 DUP 5 ;
                                                 PAIR 3 ;
                                                 DIG 4 ;
                                                 SWAP ;
                                                 EXEC ;
                                                 UPDATE 1 } ;
                                             NIL operation } } ;
                                     DUP 3 ;
                                     CAR ;
                                     DUP 5 ;
                                     PAIR ;
                                     EMIT %resolve_proposal
                                       (pair (nat %proposal_id)
                                             (or %proposal_state
                                                (unit %proposing)
                                                (or (unit %executed) (or (unit %rejected) (unit %expired))))) ;
                                     DIG 3 ;
                                     PACK ;
                                     DIG 4 ;
                                     PAIR ;
                                     EMIT %archive_proposal (pair (nat %proposal_id) (bytes %proposal)) ;
                                     DIG 3 ;
                                     DIG 3 ;
                                     DIG 2 ;
                                     CONS }
                                   { DIG 3 ;
                                     DIG 6 ;
                                     DIG 7 ;
                                     DIG 8 ;
                                     DIG 11 ;
                                     DIG 12 ;
                                     DIG 13 ;
                                     DROP 7 ;
                                     SWAP ;
                                     NIL (or (pair address mutez)
                                             (or (pair (option bytes) (lambda unit (list operation)))
                                                 (or nat
                                                     (or nat
                                                         (or int
                                                             (or int
                                                                 (or nat
                                                                     (or (pair string bytes)
                                                                         (or string (or bytes (or (pair address nat nat) (pair nat (map string bytes))))))))))))) ;
                                     DIG 2 ;
                                     LEFT (or (pair address nat nat) (pair nat (map string bytes))) ;
                                     RIGHT string ;
                                     RIGHT (pair string bytes) ;
                                     RIGHT nat ;
                                     RIGHT int ;
                                     RIGHT int ;
                                     RIGHT nat ;
                                     RIGHT nat ;
                                     RIGHT (pair (option bytes) (lambda unit (list operation))) ;
                                     RIGHT (pair address mutez) ;
                                     CONS ;
                                     SWAP ;
                                     UNPAIR 3 ;
                                     DUP ;
                                     GET 9 ;
                                     DUP 3 ;
                                     SENDER ;
                                     DIG 2 ;
                                     PAIR 3 ;
                                     DIG 5 ;
                                     SWAP ;
                                     EXEC ;
                                     DROP ;
                                     AMOUNT ;
                                     DIG 6 ;
                                     SWAP ;
                                     EXEC ;
                                     DROP ;
                                     PUSH nat 0 ;
                                     DUP 5 ;
                                     SIZE ;
                                     COMPARE ;
                                     GT ;
                                     IF {} { PUSH string "There is no content in proposal" ; FAILWITH } ;
                                     DUP 4 ;
                                     ITER { DUP 6 ; SWAP ; EXEC ; DROP } ;
                                     DIG 4 ;
                                     DROP ;
                                     EMPTY_MAP (or unit (or unit unit)) nat ;
                                     PUSH nat 0 ;
                                     UNIT ;
                                     RIGHT unit ;
                                     RIGHT unit ;
                                     SWAP ;
                                     SOME ;
                                     SWAP ;
                                     UPDATE ;
                                     PUSH nat 0 ;
                                     UNIT ;
                                     LEFT unit ;
                                     RIGHT unit ;
                                     SWAP ;
                                     SOME ;
                                     SWAP ;
                                     UPDATE ;
                                     PUSH nat 0 ;
                                     UNIT ;
                                     LEFT (or unit unit) ;
                                     SWAP ;
                                     SOME ;
                                     SWAP ;
                                     UPDATE ;
                                     DIG 4 ;
                                     NONE (pair address timestamp) ;
                                     NOW ;
                                     SENDER ;
                                     PAIR ;
                                     DIG 3 ;
                                     UNIT ;
                                     LEFT (or unit (or unit unit)) ;
                                     PAIR 5 ;
                                     PAIR ;
                                     DIG 3 ;
                                     SWAP ;
                                     EXEC ;
                                     DUP ;
                                     CAR ;
                                     DUP ;
                                     EMIT %create_proposal nat ;
                                     DUP 4 ;
                                     GET 8 ;
                                     GET 4 ;
                                     DUP ;
                                     DUP 4 ;
                                     MEM ;
                                     NOT ;
                                     IF {} { PUSH string "The given lock key does exist" ; FAILWITH } ;
                                     DIG 2 ;
                                     PUSH bool True ;
                                     SWAP ;
                                     UPDATE ;
                                     DIG 3 ;
                                     PAIR ;
                                     DIG 4 ;
                                     SWAP ;
                                     EXEC ;
                                     DIG 3 ;
                                     SWAP ;
                                     DIG 3 ;
                                     PAIR 3 ;
                                     NIL operation } } } } ;
                     DIG 2 ;
                     CONS ;
                     DUP 2 ;
                     CAR ;
                     PUSH nat 0 ;
                     DUP 2 ;
                     GET 11 ;
                     COMPARE ;
                     GT ;
                     IF {} { PUSH string "The supermajority must be >= 1" ; FAILWITH } ;
                     PUSH nat 0 ;
                     DUP 2 ;
                     GET 13 ;
                     COMPARE ;
                     GT ;
                     IF {} { PUSH string "The quorum must be >= 1" ; FAILWITH } ;
                     PUSH int 0 ;
                     DUP 2 ;
                     GET 15 ;
                     COMPARE ;
                     GT ;
                     IF {} { PUSH string "The voting period must be >= 1" ; FAILWITH } ;
                     PUSH int 0 ;
                     SWAP ;
                     GET 16 ;
                     COMPARE ;
                     GT ;
                     IF {} { PUSH string "The execution period must be >= 1" ; FAILWITH } } } } ;
         PAIR } }
`;
export default v0_4_0;
