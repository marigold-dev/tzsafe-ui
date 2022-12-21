const contract = `{ parameter
  (or (or (or (list %create_proposal
                 (or (or (or (set %add_signers address) (nat %adjust_threshold))
                         (or (pair %execute (address %target) (unit %parameter) (mutez %amount))
                             (lambda %execute_lambda unit operation)))
                     (or (set %remove_signers address)
                         (pair %transfer (address %target) (unit %parameter) (mutez %amount)))))
              (unit %default))
          (or (nat %execute_proposal) (nat %sign_and_execute_proposal)))
      (nat %sign_proposal_only)) ;
storage
  (pair (nat %proposal_counter)
        (big_map %proposal_map
           nat
           (pair (set %approved_signers address)
                 (address %proposer)
                 (option %executed address)
                 (nat %number_of_signer)
                 (timestamp %timestamp)
                 (list %content
                    (or (or (or (set %add_signers address) (nat %adjust_threshold))
                            (or (pair %execute (address %target) (unit %parameter) (mutez %amount))
                                (lambda %execute_lambda unit operation)))
                        (or (set %remove_signers address)
                            (pair %transfer (address %target) (unit %parameter) (mutez %amount)))))))
        (set %signers address)
        (nat %threshold)
        (big_map %metadata string bytes)) ;
code { PUSH string "Only the contract signers can perform this operation" ;
       PUSH string "No proposal exists for this counter" ;
       PUSH string "You have already signed this proposal" ;
       PUSH string "Unknown contract" ;
       PUSH string "Threshold must be greater than 1" ;
       NIL operation ;
       DIG 6 ;
       UNPAIR ;
       PUSH nat 0 ;
       DUP 3 ;
       GET 5 ;
       SIZE ;
       COMPARE ;
       GT ;
       IF {} { PUSH string "No signer is set in the contract" ; FAILWITH } ;
       DUP 2 ;
       GET 7 ;
       DUP 3 ;
       GET 5 ;
       SIZE ;
       COMPARE ;
       GE ;
       IF {}
          { PUSH string "Number of signer should be greater than threshold" ; FAILWITH } ;
       PUSH nat 0 ;
       DUP 3 ;
       GET 7 ;
       COMPARE ;
       GT ;
       IF {} { DUP 4 ; FAILWITH } ;
       IF_LEFT
         { IF_LEFT
             { DIG 2 ;
               DIG 4 ;
               DIG 5 ;
               DIG 6 ;
               DROP 4 ;
               IF_LEFT
                 { DUP 2 ;
                   GET 5 ;
                   SENDER ;
                   MEM ;
                   IF { DIG 3 ; DROP } { DIG 3 ; FAILWITH } ;
                   AMOUNT ;
                   PUSH mutez 0 ;
                   SWAP ;
                   COMPARE ;
                   EQ ;
                   IF {}
                      { PUSH string "You must not send tez to the smart contract" ; FAILWITH } ;
                   DUP ;
                   ITER { IF_LEFT
                            { IF_LEFT
                                { IF_LEFT
                                    { DROP }
                                    { PUSH nat 0 ; SWAP ; COMPARE ; GT ; IF {} { DUP 3 ; FAILWITH } } }
                                { IF_LEFT { DROP } { DROP } } }
                            { IF_LEFT { DROP } { DROP } } } ;
                   DIG 2 ;
                   DROP ;
                   NOW ;
                   PUSH nat 0 ;
                   NONE address ;
                   SENDER ;
                   EMPTY_SET address ;
                   PAIR 6 ;
                   PUSH nat 1 ;
                   DUP 3 ;
                   CAR ;
                   ADD ;
                   DUP 3 ;
                   DIG 3 ;
                   GET 3 ;
                   DUP 4 ;
                   DUP 4 ;
                   SWAP ;
                   SOME ;
                   SWAP ;
                   UPDATE ;
                   UPDATE 3 ;
                   SWAP ;
                   UPDATE 1 ;
                   SWAP ;
                   DUP 2 ;
                   CAR ;
                   PAIR ;
                   EMIT %create_proposal
                     (pair nat
                           (set %approved_signers address)
                           (address %proposer)
                           (option %executed address)
                           (nat %number_of_signer)
                           (timestamp %timestamp)
                           (list %content
                              (or (or (or (set %add_signers address) (nat %adjust_threshold))
                                      (or (pair %execute (address %target) (unit %parameter) (mutez %amount))
                                          (lambda %execute_lambda unit operation)))
                                  (or (set %remove_signers address)
                                      (pair %transfer (address %target) (unit %parameter) (mutez %amount)))))) }
                 { DIG 2 ;
                   DIG 3 ;
                   DROP 3 ;
                   AMOUNT ;
                   SENDER ;
                   PAIR ;
                   EMIT %receiving_tez (pair address mutez) } ;
               SWAP ;
               NIL operation ;
               DIG 2 ;
               CONS }
             { DIG 3 ;
               DROP ;
               IF_LEFT
                 { DIG 4 ;
                   DROP ;
                   DUP 2 ;
                   GET 5 ;
                   SENDER ;
                   MEM ;
                   IF { DIG 5 ; DROP } { DIG 5 ; FAILWITH } ;
                   DUP 2 ;
                   GET 3 ;
                   DUP 2 ;
                   GET ;
                   IF_NONE { DIG 4 ; FAILWITH } { DIG 5 ; DROP } ;
                   DUP ;
                   GET 5 ;
                   IF_NONE { PUSH bool True } { DROP ; PUSH bool False } ;
                   IF {} { PUSH string "This proposal has been executed" ; FAILWITH } ;
                   SENDER ;
                   DUP 2 ;
                   GET 5 ;
                   IF_NONE { PUSH bool True } { DROP ; PUSH bool False } ;
                   DUP 5 ;
                   GET 7 ;
                   DUP 4 ;
                   CAR ;
                   SIZE ;
                   COMPARE ;
                   GE ;
                   AND ;
                   IF { SWAP ; SENDER ; SOME ; UPDATE 5 } { SWAP } ;
                   DUP ;
                   GET 5 ;
                   IF_NONE { PUSH bool False } { DROP ; PUSH bool True } ;
                   IF {}
                      { PUSH string "No enough approval to execute the proposal" ; FAILWITH } ;
                   DUP 4 ;
                   DIG 4 ;
                   GET 3 ;
                   DUP 3 ;
                   SOME ;
                   DUP 6 ;
                   UPDATE ;
                   UPDATE 3 ;
                   DUP 2 ;
                   GET 5 ;
                   IF_NONE { PUSH bool False } { DROP ; PUSH bool True } ;
                   IF { DIG 4 ;
                        PAIR ;
                        SWAP ;
                        GET 10 ;
                        ITER { SWAP ;
                               UNPAIR ;
                               DIG 2 ;
                               IF_LEFT
                                 { IF_LEFT
                                     { IF_LEFT
                                         { DUP 3 ;
                                           DIG 3 ;
                                           GET 5 ;
                                           DIG 2 ;
                                           ITER { PUSH bool True ; SWAP ; UPDATE } ;
                                           UPDATE 5 }
                                         { DIG 2 ; SWAP ; UPDATE 7 } ;
                                       NONE operation }
                                     { IF_LEFT
                                         { DIG 2 ;
                                           DUP 2 ;
                                           CAR ;
                                           CONTRACT unit ;
                                           IF_NONE { DUP 6 ; FAILWITH } {} ;
                                           DUP 3 ;
                                           GET 4 ;
                                           DIG 3 ;
                                           GET 3 ;
                                           TRANSFER_TOKENS }
                                         { DIG 2 ; UNIT ; DIG 2 ; SWAP ; EXEC } ;
                                       SOME } }
                                 { IF_LEFT
                                     { DUP 3 ;
                                       DIG 3 ;
                                       GET 5 ;
                                       DIG 2 ;
                                       ITER { PUSH bool False ; SWAP ; UPDATE } ;
                                       UPDATE 5 ;
                                       NONE operation }
                                     { DIG 2 ;
                                       DUP 2 ;
                                       CAR ;
                                       CONTRACT unit ;
                                       IF_NONE { DUP 6 ; FAILWITH } {} ;
                                       DUP 3 ;
                                       GET 4 ;
                                       DIG 3 ;
                                       GET 3 ;
                                       TRANSFER_TOKENS ;
                                       SOME } } ;
                               IF_NONE { SWAP } { SWAP ; DUG 2 ; CONS } ;
                               PAIR } ;
                        DIG 3 ;
                        DROP }
                      { SWAP ; DIG 5 ; DROP 2 ; DIG 3 ; PAIR } ;
                   UNPAIR ;
                   DIG 2 ;
                   DIG 3 ;
                   PAIR ;
                   EMIT %execute_proposal (pair nat address) ;
                   CONS }
                 { DUP 2 ;
                   GET 5 ;
                   SENDER ;
                   MEM ;
                   IF { DIG 6 ; DROP } { DIG 6 ; FAILWITH } ;
                   DUP 2 ;
                   GET 3 ;
                   DUP 2 ;
                   GET ;
                   IF_NONE { DIG 5 ; FAILWITH } { DIG 6 ; DROP } ;
                   DUP ;
                   GET 5 ;
                   IF_NONE { PUSH bool True } { DROP ; PUSH bool False } ;
                   IF {} { PUSH string "This proposal has been executed" ; FAILWITH } ;
                   DUP ;
                   CAR ;
                   SENDER ;
                   MEM ;
                   NOT ;
                   IF { DIG 5 ; DROP } { DIG 5 ; FAILWITH } ;
                   SENDER ;
                   DUP 2 ;
                   DUP 3 ;
                   CAR ;
                   DUP 3 ;
                   PUSH bool True ;
                   SWAP ;
                   UPDATE ;
                   UPDATE 1 ;
                   PUSH nat 1 ;
                   DIG 3 ;
                   GET 7 ;
                   ADD ;
                   UPDATE 7 ;
                   DUP ;
                   GET 5 ;
                   IF_NONE { PUSH bool True } { DROP ; PUSH bool False } ;
                   DUP 5 ;
                   GET 7 ;
                   DUP 3 ;
                   CAR ;
                   SIZE ;
                   COMPARE ;
                   GE ;
                   AND ;
                   IF { SENDER ; SOME ; UPDATE 5 } {} ;
                   DUP 4 ;
                   DIG 4 ;
                   GET 3 ;
                   DUP 3 ;
                   SOME ;
                   DUP 6 ;
                   UPDATE ;
                   UPDATE 3 ;
                   DUP 2 ;
                   GET 5 ;
                   IF_NONE { PUSH bool False } { DROP ; PUSH bool True } ;
                   IF { DIG 4 ;
                        PAIR ;
                        DUP 2 ;
                        GET 10 ;
                        ITER { SWAP ;
                               UNPAIR ;
                               DIG 2 ;
                               IF_LEFT
                                 { IF_LEFT
                                     { IF_LEFT
                                         { DUP 3 ;
                                           DIG 3 ;
                                           GET 5 ;
                                           DIG 2 ;
                                           ITER { PUSH bool True ; SWAP ; UPDATE } ;
                                           UPDATE 5 }
                                         { DIG 2 ; SWAP ; UPDATE 7 } ;
                                       NONE operation }
                                     { IF_LEFT
                                         { DIG 2 ;
                                           DUP 2 ;
                                           CAR ;
                                           CONTRACT unit ;
                                           IF_NONE { DUP 7 ; FAILWITH } {} ;
                                           DUP 3 ;
                                           GET 4 ;
                                           DIG 3 ;
                                           GET 3 ;
                                           TRANSFER_TOKENS }
                                         { DIG 2 ; UNIT ; DIG 2 ; SWAP ; EXEC } ;
                                       SOME } }
                                 { IF_LEFT
                                     { DUP 3 ;
                                       DIG 3 ;
                                       GET 5 ;
                                       DIG 2 ;
                                       ITER { PUSH bool False ; SWAP ; UPDATE } ;
                                       UPDATE 5 ;
                                       NONE operation }
                                     { DIG 2 ;
                                       DUP 2 ;
                                       CAR ;
                                       CONTRACT unit ;
                                       IF_NONE { DUP 7 ; FAILWITH } {} ;
                                       DUP 3 ;
                                       GET 4 ;
                                       DIG 3 ;
                                       GET 3 ;
                                       TRANSFER_TOKENS ;
                                       SOME } } ;
                               IF_NONE { SWAP } { SWAP ; DUG 2 ; CONS } ;
                               PAIR } ;
                        DIG 4 ;
                        DROP }
                      { DIG 5 ; DROP ; DIG 4 ; PAIR } ;
                   UNPAIR ;
                   DUP 4 ;
                   DUP 6 ;
                   PAIR ;
                   EMIT %sign_proposal (pair nat address) ;
                   CONS ;
                   DIG 2 ;
                   GET 5 ;
                   IF_NONE { PUSH bool False } { DROP ; PUSH bool True } ;
                   IF { DIG 2 ; DIG 3 ; PAIR ; EMIT %execute_proposal (pair nat address) ; CONS }
                      { DIG 2 ; DIG 3 ; DROP 2 } } } }
         { DIG 2 ;
           DIG 3 ;
           DIG 4 ;
           DROP 3 ;
           DUP 2 ;
           GET 5 ;
           SENDER ;
           MEM ;
           IF { DIG 4 ; DROP } { DIG 4 ; FAILWITH } ;
           DUP 2 ;
           GET 3 ;
           DUP 2 ;
           GET ;
           IF_NONE { DIG 3 ; FAILWITH } { DIG 4 ; DROP } ;
           DUP ;
           GET 5 ;
           IF_NONE { PUSH bool True } { DROP ; PUSH bool False } ;
           IF {} { PUSH string "This proposal has been executed" ; FAILWITH } ;
           DUP ;
           CAR ;
           SENDER ;
           MEM ;
           NOT ;
           IF { DIG 3 ; DROP } { DIG 3 ; FAILWITH } ;
           SENDER ;
           DUP 2 ;
           DUP 3 ;
           CAR ;
           DUP 3 ;
           PUSH bool True ;
           SWAP ;
           UPDATE ;
           UPDATE 1 ;
           PUSH nat 1 ;
           DIG 3 ;
           GET 7 ;
           ADD ;
           UPDATE 7 ;
           SWAP ;
           DUP 3 ;
           PAIR ;
           EMIT %sign_proposal (pair nat address) ;
           DUP 4 ;
           DIG 4 ;
           GET 3 ;
           DIG 3 ;
           SOME ;
           DIG 4 ;
           UPDATE ;
           UPDATE 3 ;
           NIL operation ;
           DIG 2 ;
           CONS } ;
       PAIR } ;
view "signers" unit (set address) { CDR ; GET 5 } ;
view "threshold" unit nat { CDR ; GET 7 } ;
view "proposal"
     nat
     (pair (set %approved_signers address)
           (address %proposer)
           (option %executed address)
           (nat %number_of_signer)
           (timestamp %timestamp)
           (list %content
              (or (or (or (set %add_signers address) (nat %adjust_threshold))
                      (or (pair %execute (address %target) (unit %parameter) (mutez %amount))
                          (unit %execute_lambda)))
                  (or (set %remove_signers address)
                      (pair %transfer (address %target) (unit %parameter) (mutez %amount))))))
     { UNPAIR ;
       SWAP ;
       GET 3 ;
       SWAP ;
       GET ;
       IF_NONE { PUSH string "No proposal exists for this counter" ; FAILWITH } {} ;
       DUP ;
       GET 10 ;
       MAP { IF_LEFT
               { IF_LEFT
                   { IF_LEFT { LEFT nat } { RIGHT (set address) } ;
                     LEFT (or (pair address unit mutez) unit) }
                   { IF_LEFT { LEFT unit } { DROP ; UNIT ; RIGHT (pair address unit mutez) } ;
                     RIGHT (or (set address) nat) } ;
                 LEFT (or (set address) (pair address unit mutez)) }
               { IF_LEFT { LEFT (pair address unit mutez) } { RIGHT (set address) } ;
                 RIGHT (or (or (set address) nat) (or (pair address unit mutez) unit)) } } ;
       DUP 2 ;
       GET 9 ;
       DUP 3 ;
       GET 7 ;
       DUP 4 ;
       GET 5 ;
       DUP 5 ;
       GET 3 ;
       DIG 5 ;
       CAR ;
       PAIR 6 } ;
view "proposals"
     (pair nat nat)
     (map nat
          (pair (set %approved_signers address)
                (address %proposer)
                (option %executed address)
                (nat %number_of_signer)
                (timestamp %timestamp)
                (list %content
                   (or (or (or (set %add_signers address) (nat %adjust_threshold))
                           (or (pair %execute (address %target) (unit %parameter) (mutez %amount))
                               (unit %execute_lambda)))
                       (or (set %remove_signers address)
                           (pair %transfer (address %target) (unit %parameter) (mutez %amount)))))))
     { UNPAIR ;
       UNPAIR ;
       DUP 2 ;
       ADD ;
       EMPTY_MAP
         nat
         (pair (set address)
               address
               (option address)
               nat
               timestamp
               (list (or (or (or (set address) nat) (or (pair address unit mutez) (lambda unit operation)))
                         (or (set address) (pair address unit mutez))))) ;
       DIG 3 ;
       GET 3 ;
       PAIR ;
       SWAP ;
       DIG 2 ;
       PAIR ;
       PAIR ;
       LEFT (map nat
                 (pair (set address)
                       address
                       (option address)
                       nat
                       timestamp
                       (list (or (or (or (set address) nat) (or (pair address unit mutez) (lambda unit operation)))
                                 (or (set address) (pair address unit mutez)))))) ;
       LOOP_LEFT
         { UNPAIR ;
           UNPAIR ;
           DIG 2 ;
           UNPAIR ;
           PUSH nat 1 ;
           DIG 3 ;
           ADD ;
           DUP 4 ;
           DUP 2 ;
           COMPARE ;
           GT ;
           IF { SWAP ;
                DIG 3 ;
                DROP 3 ;
                RIGHT
                  (pair (pair nat nat)
                        (big_map
                           nat
                           (pair (set address)
                                 address
                                 (option address)
                                 nat
                                 timestamp
                                 (list (or (or (or (set address) nat) (or (pair address unit mutez) (lambda unit operation)))
                                           (or (set address) (pair address unit mutez))))))
                        (map nat
                             (pair (set address)
                                   address
                                   (option address)
                                   nat
                                   timestamp
                                   (list (or (or (or (set address) nat) (or (pair address unit mutez) (lambda unit operation)))
                                             (or (set address) (pair address unit mutez))))))) }
              { DUP 2 ;
                DUP 2 ;
                GET ;
                IF_NONE { DIG 2 } { DIG 3 ; SWAP ; DUP 3 ; SWAP ; SOME ; SWAP ; UPDATE } ;
                DIG 2 ;
                PAIR ;
                DUG 2 ;
                PAIR ;
                PAIR ;
                LEFT (map nat
                          (pair (set address)
                                address
                                (option address)
                                nat
                                timestamp
                                (list (or (or (or (set address) nat) (or (pair address unit mutez) (lambda unit operation)))
                                          (or (set address) (pair address unit mutez)))))) } } ;
       LAMBDA
         (pair nat
               (set address)
               address
               (option address)
               nat
               timestamp
               (list (or (or (or (set address) nat) (or (pair address unit mutez) (lambda unit operation)))
                         (or (set address) (pair address unit mutez)))))
         (pair (set address)
               address
               (option address)
               nat
               timestamp
               (list (or (or (or (set address) nat) (or (pair address unit mutez) unit))
                         (or (set address) (pair address unit mutez)))))
         { CDR ;
           DUP ;
           GET 10 ;
           MAP { IF_LEFT
                   { IF_LEFT
                       { IF_LEFT { LEFT nat } { RIGHT (set address) } ;
                         LEFT (or (pair address unit mutez) unit) }
                       { IF_LEFT { LEFT unit } { DROP ; UNIT ; RIGHT (pair address unit mutez) } ;
                         RIGHT (or (set address) nat) } ;
                     LEFT (or (set address) (pair address unit mutez)) }
                   { IF_LEFT { LEFT (pair address unit mutez) } { RIGHT (set address) } ;
                     RIGHT (or (or (set address) nat) (or (pair address unit mutez) unit)) } } ;
           DUP 2 ;
           GET 9 ;
           DUP 3 ;
           GET 7 ;
           DUP 4 ;
           GET 5 ;
           DUP 5 ;
           GET 3 ;
           DIG 5 ;
           CAR ;
           PAIR 6 } ;
       SWAP ;
       MAP { DUP 2 ; SWAP ; EXEC } ;
       SWAP ;
       DROP } }`
export default contract
