const contract = `{ parameter
  (or (or (or (list %create_proposal
                 (or (or (or (set %add_signers address) (nat %adjust_threshold))
                         (or (pair %execute (address %target) (unit %parameter) (mutez %amount))
                             (lambda %execute_lambda unit operation)))
                     (or (set %remove_signers address)
                         (pair %transfer (address %target) (unit %parameter) (mutez %amount)))))
              (unit %default))
          (or (nat %execute_proposal) (pair %sign_and_execute_proposal nat bool)))
      (pair %sign_proposal_only nat bool)) ;
storage
  (pair (nat %proposal_counter)
        (big_map %proposal_map
           nat
           (pair (or %state (or (unit %active) (unit %closed)) (unit %done))
                 (map %signatures address bool)
                 (address %proposer)
                 (option %executed address)
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
code { PUSH bool True ;
       PUSH string "Only the contract signers can perform this operation" ;
       PUSH string "No proposal exists for this counter" ;
       PUSH string "You have already signed this proposal" ;
       PUSH string "Unknown contract" ;
       PUSH string "Threshold must be greater than 1" ;
       NIL operation ;
       DIG 7 ;
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
               DIG 8 ;
               DROP 5 ;
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
                   NONE address ;
                   SENDER ;
                   EMPTY_MAP address bool ;
                   UNIT ;
                   LEFT unit ;
                   LEFT unit ;
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
                           (or %state (or (unit %active) (unit %closed)) (unit %done))
                           (map %signatures address bool)
                           (address %proposer)
                           (option %executed address)
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
                   GET 7 ;
                   IF_NONE { DUP 6 } { DROP ; PUSH bool False } ;
                   IF {} { PUSH string "This proposal has been executed" ; FAILWITH } ;
                   SENDER ;
                   DUP 4 ;
                   GET 7 ;
                   PUSH nat 0 ;
                   PUSH nat 0 ;
                   PAIR ;
                   DUP 4 ;
                   GET 3 ;
                   ITER { SWAP ;
                          UNPAIR ;
                          DIG 2 ;
                          CDR ;
                          IF { SWAP ; PUSH nat 1 ; DIG 2 ; ADD }
                             { PUSH nat 1 ; DIG 2 ; ADD ; SWAP } ;
                          PAIR } ;
                   UNPAIR ;
                   DUP 5 ;
                   GET 7 ;
                   IF_NONE { DUP 10 } { DROP ; PUSH bool False } ;
                   DUP 4 ;
                   DIG 2 ;
                   COMPARE ;
                   GE ;
                   AND ;
                   IF { DIG 3 ; UNIT ; RIGHT (or unit unit) ; UPDATE 1 ; SENDER ; SOME ; UPDATE 7 }
                      { DIG 3 } ;
                   DIG 2 ;
                   DUP 6 ;
                   GET 5 ;
                   SIZE ;
                   SUB ;
                   ABS ;
                   DUG 2 ;
                   DUP ;
                   GET 7 ;
                   IF_NONE { DUP 9 } { DROP ; PUSH bool False } ;
                   DIG 3 ;
                   DIG 3 ;
                   COMPARE ;
                   GT ;
                   AND ;
                   IF { UNIT ; RIGHT unit ; LEFT unit ; UPDATE 1 ; SENDER ; SOME ; UPDATE 7 }
                      {} ;
                   DUP ;
                   GET 7 ;
                   IF_NONE { DIG 6 ; DROP ; PUSH bool False } { DROP ; DIG 6 } ;
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
                   UNIT ;
                   RIGHT (or unit unit) ;
                   DUP 3 ;
                   CAR ;
                   COMPARE ;
                   EQ ;
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
                 { UNPAIR ;
                   DUP 3 ;
                   GET 5 ;
                   SENDER ;
                   MEM ;
                   IF { DIG 7 ; DROP } { DIG 7 ; FAILWITH } ;
                   DUP 3 ;
                   GET 3 ;
                   DUP 2 ;
                   GET ;
                   IF_NONE { DIG 6 ; FAILWITH } { DIG 7 ; DROP } ;
                   DUP ;
                   GET 7 ;
                   IF_NONE { DUP 8 } { DROP ; PUSH bool False } ;
                   IF {} { PUSH string "This proposal has been executed" ; FAILWITH } ;
                   DUP ;
                   GET 3 ;
                   SENDER ;
                   MEM ;
                   NOT ;
                   IF { DIG 6 ; DROP } { DIG 6 ; FAILWITH } ;
                   SENDER ;
                   DUP 5 ;
                   GET 7 ;
                   DUP 3 ;
                   DIG 3 ;
                   GET 3 ;
                   DIG 5 ;
                   SOME ;
                   DUP 5 ;
                   UPDATE ;
                   UPDATE 3 ;
                   PUSH nat 0 ;
                   PUSH nat 0 ;
                   PAIR ;
                   DUP 2 ;
                   GET 3 ;
                   ITER { SWAP ;
                          UNPAIR ;
                          DIG 2 ;
                          CDR ;
                          IF { SWAP ; PUSH nat 1 ; DIG 2 ; ADD }
                             { PUSH nat 1 ; DIG 2 ; ADD ; SWAP } ;
                          PAIR } ;
                   UNPAIR ;
                   DUP 3 ;
                   GET 7 ;
                   IF_NONE { DUP 10 } { DROP ; PUSH bool False } ;
                   DUP 5 ;
                   DIG 2 ;
                   COMPARE ;
                   GE ;
                   AND ;
                   IF { SWAP ; UNIT ; RIGHT (or unit unit) ; UPDATE 1 ; SENDER ; SOME ; UPDATE 7 }
                      { SWAP } ;
                   DIG 2 ;
                   DUP 6 ;
                   GET 5 ;
                   SIZE ;
                   SUB ;
                   ABS ;
                   DUG 2 ;
                   DUP ;
                   GET 7 ;
                   IF_NONE { DUP 9 } { DROP ; PUSH bool False } ;
                   DIG 3 ;
                   DIG 3 ;
                   COMPARE ;
                   GT ;
                   AND ;
                   IF { UNIT ; RIGHT unit ; LEFT unit ; UPDATE 1 ; SENDER ; SOME ; UPDATE 7 }
                      {} ;
                   DUP 4 ;
                   DIG 4 ;
                   GET 3 ;
                   DUP 3 ;
                   SOME ;
                   DUP 6 ;
                   UPDATE ;
                   UPDATE 3 ;
                   UNIT ;
                   RIGHT (or unit unit) ;
                   DUP 3 ;
                   CAR ;
                   COMPARE ;
                   EQ ;
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
                   GET 7 ;
                   IF_NONE { DIG 4 ; DROP ; PUSH bool False } { DROP ; DIG 4 } ;
                   IF { DIG 2 ; DIG 3 ; PAIR ; EMIT %execute_proposal (pair nat address) ; CONS }
                      { DIG 2 ; DIG 3 ; DROP 2 } } } }
         { DIG 2 ;
           DIG 3 ;
           DIG 4 ;
           DROP 3 ;
           UNPAIR ;
           DUP 3 ;
           GET 5 ;
           SENDER ;
           MEM ;
           IF { DIG 5 ; DROP } { DIG 5 ; FAILWITH } ;
           DUP 3 ;
           GET 3 ;
           DUP 2 ;
           GET ;
           IF_NONE { DIG 4 ; FAILWITH } { DIG 5 ; DROP } ;
           DUP ;
           GET 7 ;
           IF_NONE { DIG 5 } { DIG 6 ; DROP 2 ; PUSH bool False } ;
           IF {} { PUSH string "This proposal has been executed" ; FAILWITH } ;
           DUP ;
           GET 3 ;
           SENDER ;
           MEM ;
           NOT ;
           IF { DIG 4 ; DROP } { DIG 4 ; FAILWITH } ;
           SENDER ;
           DUP ;
           DUP 4 ;
           PAIR ;
           EMIT %sign_proposal (pair nat address) ;
           DUP 6 ;
           DIG 6 ;
           GET 3 ;
           DUP 5 ;
           DIG 5 ;
           GET 3 ;
           DIG 7 ;
           SOME ;
           DIG 6 ;
           UPDATE ;
           UPDATE 3 ;
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
     (pair (or %state (or (unit %active) (unit %closed)) (unit %done))
           (map %signatures address bool)
           (address %proposer)
           (option %executed address)
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
          (pair (or %state (or (unit %active) (unit %closed)) (unit %done))
                (map %signatures address bool)
                (address %proposer)
                (option %executed address)
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
         (pair (or (or unit unit) unit)
               (map address bool)
               address
               (option address)
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
                 (pair (or (or unit unit) unit)
                       (map address bool)
                       address
                       (option address)
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
                           (pair (or (or unit unit) unit)
                                 (map address bool)
                                 address
                                 (option address)
                                 timestamp
                                 (list (or (or (or (set address) nat) (or (pair address unit mutez) (lambda unit operation)))
                                           (or (set address) (pair address unit mutez))))))
                        (map nat
                             (pair (or (or unit unit) unit)
                                   (map address bool)
                                   address
                                   (option address)
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
                          (pair (or (or unit unit) unit)
                                (map address bool)
                                address
                                (option address)
                                timestamp
                                (list (or (or (or (set address) nat) (or (pair address unit mutez) (lambda unit operation)))
                                          (or (set address) (pair address unit mutez)))))) } } ;
       LAMBDA
         (pair nat
               (or (or unit unit) unit)
               (map address bool)
               address
               (option address)
               timestamp
               (list (or (or (or (set address) nat) (or (pair address unit mutez) (lambda unit operation)))
                         (or (set address) (pair address unit mutez)))))
         (pair (or (or unit unit) unit)
               (map address bool)
               address
               (option address)
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
