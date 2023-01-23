const contract = `
{ parameter
  (or (or (or (list %create_proposal
                 (or (or (or (set %add_owners address) (nat %adjust_threshold))
                         (or (pair %execute (address %target) (unit %parameter) (mutez %amount))
                             (pair %execute_lambda (lambda %lambda unit operation) (option %metadata bytes))))
                     (or (set %remove_owners address)
                         (pair %transfer (address %target) (unit %parameter) (mutez %amount)))))
              (unit %default))
          (or (pair %resolve_proposal
                 nat
                 (list (or (or (or (set %add_owners address) (nat %adjust_threshold))
                               (or (pair %execute (address %target) (unit %parameter) (mutez %amount))
                                   (pair %execute_lambda (lambda %lambda unit operation) (option %metadata bytes))))
                           (or (set %remove_owners address)
                               (pair %transfer (address %target) (unit %parameter) (mutez %amount))))))
              (pair %sign_and_resolve_proposal
                 (pair nat
                       (list (or (or (or (set %add_owners address) (nat %adjust_threshold))
                                     (or (pair %execute (address %target) (unit %parameter) (mutez %amount))
                                         (pair %execute_lambda (lambda %lambda unit operation) (option %metadata bytes))))
                                 (or (set %remove_owners address)
                                     (pair %transfer (address %target) (unit %parameter) (mutez %amount))))))
                 bool)))
      (pair %sign_proposal_only
         (pair nat
               (list (or (or (or (set %add_owners address) (nat %adjust_threshold))
                             (or (pair %execute (address %target) (unit %parameter) (mutez %amount))
                                 (pair %execute_lambda (lambda %lambda unit operation) (option %metadata bytes))))
                         (or (set %remove_owners address)
                             (pair %transfer (address %target) (unit %parameter) (mutez %amount))))))
         bool)) ;
storage
  (pair (nat %proposal_counter)
        (big_map %proposals
           nat
           (pair (or %state (or (unit %executed) (unit %proposing)) (unit %rejected))
                 (map %signatures address bool)
                 (pair %proposer (address %actor) (timestamp %timestamp))
                 (option %resolver (pair (address %actor) (timestamp %timestamp)))
                 (list %contents
                    (or (or (or (set %add_owners address) (nat %adjust_threshold))
                            (or (pair %execute (address %target) (unit %parameter) (mutez %amount))
                                (pair %execute_lambda (lambda %lambda unit operation) (option %metadata bytes))))
                        (or (set %remove_owners address)
                            (pair %transfer (address %target) (unit %parameter) (mutez %amount)))))))
        (set %owners address)
        (nat %threshold)
        (big_map %metadata string bytes)) ;
code { PUSH string "Only the contract owners can perform this operation" ;
       PUSH string "No proposal exists for this counter" ;
       PUSH string "You have already signed this proposal" ;
       PUSH string "Unknown contract" ;
       PUSH string "Threshold must be greater than 1" ;
       PUSH string "No owner to be added or removed" ;
       PUSH string "The proposal content doesn't match" ;
       NIL operation ;
       DIG 8 ;
       UNPAIR ;
       PUSH nat 0 ;
       DUP 3 ;
       GET 5 ;
       SIZE ;
       COMPARE ;
       GT ;
       IF {} { PUSH string "No owner is set in the contract" ; FAILWITH } ;
       DUP 2 ;
       GET 7 ;
       DUP 3 ;
       GET 5 ;
       SIZE ;
       COMPARE ;
       GE ;
       IF {}
          { PUSH string "Number of owner should be greater than threshold" ; FAILWITH } ;
       PUSH nat 0 ;
       DUP 3 ;
       GET 7 ;
       COMPARE ;
       GT ;
       IF {} { DUP 6 ; FAILWITH } ;
       IF_LEFT
         { IF_LEFT
             { DIG 2 ;
               DIG 3 ;
               DIG 6 ;
               DIG 7 ;
               DIG 8 ;
               DROP 5 ;
               IF_LEFT
                 { DUP 2 ;
                   GET 5 ;
                   SENDER ;
                   MEM ;
                   IF { DIG 4 ; DROP } { DIG 4 ; FAILWITH } ;
                   AMOUNT ;
                   PUSH mutez 0 ;
                   SWAP ;
                   COMPARE ;
                   EQ ;
                   IF {}
                      { PUSH string "You must not send tez to the smart contract" ; FAILWITH } ;
                   PUSH nat 0 ;
                   DUP 2 ;
                   SIZE ;
                   COMPARE ;
                   GT ;
                   IF {} { PUSH string "There is no content in proposal" ; FAILWITH } ;
                   DUP ;
                   ITER { IF_LEFT
                            { IF_LEFT
                                { IF_LEFT
                                    { PUSH nat 0 ;
                                      SWAP ;
                                      SIZE ;
                                      COMPARE ;
                                      GT ;
                                      IF {} { DUP 3 ; FAILWITH } }
                                    { PUSH nat 0 ; SWAP ; COMPARE ; GT ; IF {} { DUP 4 ; FAILWITH } } }
                                { IF_LEFT { DROP } { DROP } } }
                            { IF_LEFT
                                { PUSH nat 0 ;
                                  SWAP ;
                                  SIZE ;
                                  COMPARE ;
                                  GT ;
                                  IF {} { DUP 3 ; FAILWITH } }
                                { PUSH mutez 0 ;
                                  SWAP ;
                                  GET 4 ;
                                  COMPARE ;
                                  EQ ;
                                  NOT ;
                                  IF {} { PUSH string "Amount should be greater than zero" ; FAILWITH } } } } ;
                   DIG 2 ;
                   DIG 3 ;
                   DROP 2 ;
                   NONE (pair address timestamp) ;
                   NOW ;
                   SENDER ;
                   PAIR ;
                   EMPTY_MAP address bool ;
                   UNIT ;
                   RIGHT unit ;
                   LEFT unit ;
                   PAIR 5 ;
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
                           (or %state (or (unit %executed) (unit %proposing)) (unit %rejected))
                           (map %signatures address bool)
                           (pair %proposer (address %actor) (timestamp %timestamp))
                           (option %resolver (pair (address %actor) (timestamp %timestamp)))
                           (list %contents
                              (or (or (or (set %add_owners address) (nat %adjust_threshold))
                                      (or (pair %execute (address %target) (unit %parameter) (mutez %amount))
                                          (pair %execute_lambda (lambda %lambda unit operation) (option %metadata bytes))))
                                  (or (set %remove_owners address)
                                      (pair %transfer (address %target) (unit %parameter) (mutez %amount)))))) }
                 { DIG 2 ;
                   DIG 3 ;
                   DIG 4 ;
                   DROP 4 ;
                   AMOUNT ;
                   SENDER ;
                   PAIR ;
                   EMIT %receiving_tez (pair address mutez) } ;
               SWAP ;
               NIL operation ;
               DIG 2 ;
               CONS }
             { DIG 4 ;
               DIG 5 ;
               DROP 2 ;
               IF_LEFT
                 { DIG 5 ;
                   DROP ;
                   UNPAIR ;
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
                   UNIT ;
                   RIGHT unit ;
                   LEFT unit ;
                   DUP 2 ;
                   CAR ;
                   COMPARE ;
                   EQ ;
                   IF {} { PUSH string "This proposal has been resolved" ; FAILWITH } ;
                   SENDER ;
                   DUP 5 ;
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
                   UNIT ;
                   RIGHT unit ;
                   LEFT unit ;
                   DUP 6 ;
                   CAR ;
                   COMPARE ;
                   EQ ;
                   DUP 4 ;
                   DIG 2 ;
                   COMPARE ;
                   GE ;
                   AND ;
                   IF { DIG 3 ;
                        UNIT ;
                        LEFT unit ;
                        LEFT unit ;
                        UPDATE 1 ;
                        NOW ;
                        SENDER ;
                        PAIR ;
                        SOME ;
                        UPDATE 7 }
                      { DIG 3 } ;
                   DIG 2 ;
                   DUP 7 ;
                   GET 5 ;
                   SIZE ;
                   SUB ;
                   ABS ;
                   DUG 2 ;
                   UNIT ;
                   RIGHT unit ;
                   LEFT unit ;
                   DUP 2 ;
                   CAR ;
                   COMPARE ;
                   EQ ;
                   DIG 3 ;
                   DIG 3 ;
                   COMPARE ;
                   GT ;
                   AND ;
                   IF { UNIT ;
                        RIGHT (or unit unit) ;
                        UPDATE 1 ;
                        NOW ;
                        SENDER ;
                        PAIR ;
                        SOME ;
                        UPDATE 7 }
                      {} ;
                   UNIT ;
                   RIGHT unit ;
                   LEFT unit ;
                   DUP 2 ;
                   CAR ;
                   COMPARE ;
                   EQ ;
                   NOT ;
                   IF {}
                      { PUSH string "No enough signature to resolve the proposal" ; FAILWITH } ;
                   DIG 3 ;
                   PACK ;
                   DUP 2 ;
                   GET 8 ;
                   PACK ;
                   SWAP ;
                   COMPARE ;
                   EQ ;
                   IF { DIG 5 ; DROP } { DIG 5 ; FAILWITH } ;
                   DUP 4 ;
                   DIG 4 ;
                   GET 3 ;
                   DUP 3 ;
                   SOME ;
                   DUP 6 ;
                   UPDATE ;
                   UPDATE 3 ;
                   UNIT ;
                   LEFT unit ;
                   LEFT unit ;
                   DUP 3 ;
                   CAR ;
                   COMPARE ;
                   EQ ;
                   IF { DIG 4 ;
                        PAIR ;
                        SWAP ;
                        GET 8 ;
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
                                         { DIG 2 ; UNIT ; DIG 2 ; CAR ; SWAP ; EXEC } ;
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
                   EMIT %resolve_proposal (pair nat address) ;
                   CONS }
                 { UNPAIR ;
                   UNPAIR ;
                   DUP 4 ;
                   GET 5 ;
                   SENDER ;
                   MEM ;
                   IF { DIG 9 ; DROP } { DIG 9 ; FAILWITH } ;
                   DUP 4 ;
                   GET 3 ;
                   DUP 2 ;
                   GET ;
                   IF_NONE { DIG 8 ; FAILWITH } { DIG 9 ; DROP } ;
                   UNIT ;
                   RIGHT unit ;
                   LEFT unit ;
                   DUP 2 ;
                   CAR ;
                   COMPARE ;
                   EQ ;
                   IF {} { PUSH string "This proposal has been resolved" ; FAILWITH } ;
                   DUP ;
                   GET 3 ;
                   SENDER ;
                   MEM ;
                   NOT ;
                   IF { DIG 8 ; DROP } { DIG 8 ; FAILWITH } ;
                   DIG 2 ;
                   PACK ;
                   DUP 2 ;
                   GET 8 ;
                   PACK ;
                   SWAP ;
                   COMPARE ;
                   EQ ;
                   IF { DIG 5 ; DROP } { DIG 5 ; FAILWITH } ;
                   SENDER ;
                   DUP 5 ;
                   GET 7 ;
                   DUP 3 ;
                   DIG 3 ;
                   GET 3 ;
                   DUP 6 ;
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
                   UNIT ;
                   RIGHT unit ;
                   LEFT unit ;
                   DUP 4 ;
                   CAR ;
                   COMPARE ;
                   EQ ;
                   DUP 5 ;
                   DIG 2 ;
                   COMPARE ;
                   GE ;
                   AND ;
                   IF { SWAP ;
                        UNIT ;
                        LEFT unit ;
                        LEFT unit ;
                        UPDATE 1 ;
                        NOW ;
                        SENDER ;
                        PAIR ;
                        SOME ;
                        UPDATE 7 }
                      { SWAP } ;
                   DIG 2 ;
                   DUP 7 ;
                   GET 5 ;
                   SIZE ;
                   SUB ;
                   ABS ;
                   DUG 2 ;
                   UNIT ;
                   RIGHT unit ;
                   LEFT unit ;
                   DUP 2 ;
                   CAR ;
                   COMPARE ;
                   EQ ;
                   DIG 3 ;
                   DIG 3 ;
                   COMPARE ;
                   GT ;
                   AND ;
                   IF { UNIT ;
                        RIGHT (or unit unit) ;
                        UPDATE 1 ;
                        NOW ;
                        SENDER ;
                        PAIR ;
                        SOME ;
                        UPDATE 7 }
                      {} ;
                   DUP 5 ;
                   DIG 5 ;
                   GET 3 ;
                   DUP 3 ;
                   SOME ;
                   DUP 6 ;
                   UPDATE ;
                   UPDATE 3 ;
                   UNIT ;
                   LEFT unit ;
                   LEFT unit ;
                   DUP 3 ;
                   CAR ;
                   COMPARE ;
                   EQ ;
                   IF { DIG 5 ;
                        PAIR ;
                        DUP 2 ;
                        GET 8 ;
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
                                           IF_NONE { DUP 8 ; FAILWITH } {} ;
                                           DUP 3 ;
                                           GET 4 ;
                                           DIG 3 ;
                                           GET 3 ;
                                           TRANSFER_TOKENS }
                                         { DIG 2 ; UNIT ; DIG 2 ; CAR ; SWAP ; EXEC } ;
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
                                       IF_NONE { DUP 8 ; FAILWITH } {} ;
                                       DUP 3 ;
                                       GET 4 ;
                                       DIG 3 ;
                                       GET 3 ;
                                       TRANSFER_TOKENS ;
                                       SOME } } ;
                               IF_NONE { SWAP } { SWAP ; DUG 2 ; CONS } ;
                               PAIR } ;
                        DIG 5 ;
                        DROP }
                      { DIG 6 ; DROP ; DIG 5 ; PAIR } ;
                   UNPAIR ;
                   DIG 5 ;
                   DUP 5 ;
                   DUP 7 ;
                   PAIR ;
                   PAIR ;
                   EMIT %sign_proposal (pair (pair nat address) bool) ;
                   CONS ;
                   UNIT ;
                   RIGHT unit ;
                   LEFT unit ;
                   DIG 3 ;
                   CAR ;
                   COMPARE ;
                   EQ ;
                   IF { DIG 2 ; DIG 3 ; DROP 2 }
                      { DIG 2 ; DIG 3 ; PAIR ; EMIT %resolve_proposal (pair nat address) ; CONS } } } }
         { DIG 2 ;
           DIG 4 ;
           DIG 5 ;
           DIG 6 ;
           DROP 4 ;
           UNPAIR ;
           UNPAIR ;
           DUP 4 ;
           GET 5 ;
           SENDER ;
           MEM ;
           IF { DIG 7 ; DROP } { DIG 7 ; FAILWITH } ;
           DUP 4 ;
           GET 3 ;
           DUP 2 ;
           GET ;
           IF_NONE { DIG 6 ; FAILWITH } { DIG 7 ; DROP } ;
           UNIT ;
           RIGHT unit ;
           LEFT unit ;
           DUP 2 ;
           CAR ;
           COMPARE ;
           EQ ;
           IF {} { PUSH string "This proposal has been resolved" ; FAILWITH } ;
           DUP ;
           GET 3 ;
           SENDER ;
           MEM ;
           NOT ;
           IF { DIG 6 ; DROP } { DIG 6 ; FAILWITH } ;
           DIG 2 ;
           PACK ;
           DUP 2 ;
           GET 8 ;
           PACK ;
           SWAP ;
           COMPARE ;
           EQ ;
           IF { DIG 4 ; DROP } { DIG 4 ; FAILWITH } ;
           SENDER ;
           DUP 4 ;
           DUP 2 ;
           DUP 5 ;
           PAIR ;
           PAIR ;
           EMIT %sign_proposal (pair (pair nat address) bool) ;
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
view "owners" unit (set address) { CDR ; GET 5 } ;
view "threshold" unit nat { CDR ; GET 7 } ;
view "proposal"
     nat
     (pair (or %state (or (unit %executed) (unit %proposing)) (unit %rejected))
           (map %signatures address bool)
           (pair %proposer (address %actor) (timestamp %timestamp))
           (option %resolver (pair (address %actor) (timestamp %timestamp)))
           (list %contents
              (or (or (or (set %add_owners address) (nat %adjust_threshold))
                      (or (pair %execute (address %target) (unit %parameter) (mutez %amount))
                          (option %execute_lambda bytes)))
                  (or (set %remove_owners address)
                      (pair %transfer (address %target) (unit %parameter) (mutez %amount))))))
     { UNPAIR ;
       SWAP ;
       GET 3 ;
       SWAP ;
       GET ;
       IF_NONE { PUSH string "No proposal exists for this counter" ; FAILWITH } {} ;
       DUP ;
       GET 8 ;
       MAP { IF_LEFT
               { IF_LEFT
                   { IF_LEFT { LEFT nat } { RIGHT (set address) } ;
                     LEFT (or (pair address unit mutez) (option bytes)) }
                   { IF_LEFT { LEFT (option bytes) } { CDR ; RIGHT (pair address unit mutez) } ;
                     RIGHT (or (set address) nat) } ;
                 LEFT (or (set address) (pair address unit mutez)) }
               { IF_LEFT { LEFT (pair address unit mutez) } { RIGHT (set address) } ;
                 RIGHT (or (or (set address) nat) (or (pair address unit mutez) (option bytes))) } } ;
       DUP 2 ;
       GET 7 ;
       DUP 3 ;
       GET 5 ;
       DUP 4 ;
       GET 3 ;
       DIG 4 ;
       CAR ;
       PAIR 5 } ;
view "proposals"
     (pair nat nat)
     (map nat
          (pair (or %state (or (unit %executed) (unit %proposing)) (unit %rejected))
                (map %signatures address bool)
                (pair %proposer (address %actor) (timestamp %timestamp))
                (option %resolver (pair (address %actor) (timestamp %timestamp)))
                (list %contents
                   (or (or (or (set %add_owners address) (nat %adjust_threshold))
                           (or (pair %execute (address %target) (unit %parameter) (mutez %amount))
                               (option %execute_lambda bytes)))
                       (or (set %remove_owners address)
                           (pair %transfer (address %target) (unit %parameter) (mutez %amount)))))))
     { UNPAIR ;
       UNPAIR ;
       DUP 2 ;
       ADD ;
       EMPTY_MAP
         nat
         (pair (or (or unit unit) unit)
               (map address bool)
               (pair address timestamp)
               (option (pair address timestamp))
               (list (or (or (or (set address) nat)
                             (or (pair address unit mutez) (pair (lambda unit operation) (option bytes))))
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
                       (pair address timestamp)
                       (option (pair address timestamp))
                       (list (or (or (or (set address) nat)
                                     (or (pair address unit mutez) (pair (lambda unit operation) (option bytes))))
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
                                 (pair address timestamp)
                                 (option (pair address timestamp))
                                 (list (or (or (or (set address) nat)
                                               (or (pair address unit mutez) (pair (lambda unit operation) (option bytes))))
                                           (or (set address) (pair address unit mutez))))))
                        (map nat
                             (pair (or (or unit unit) unit)
                                   (map address bool)
                                   (pair address timestamp)
                                   (option (pair address timestamp))
                                   (list (or (or (or (set address) nat)
                                                 (or (pair address unit mutez) (pair (lambda unit operation) (option bytes))))
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
                                (pair address timestamp)
                                (option (pair address timestamp))
                                (list (or (or (or (set address) nat)
                                              (or (pair address unit mutez) (pair (lambda unit operation) (option bytes))))
                                          (or (set address) (pair address unit mutez)))))) } } ;
       LAMBDA
         (pair nat
               (or (or unit unit) unit)
               (map address bool)
               (pair address timestamp)
               (option (pair address timestamp))
               (list (or (or (or (set address) nat)
                             (or (pair address unit mutez) (pair (lambda unit operation) (option bytes))))
                         (or (set address) (pair address unit mutez)))))
         (pair (or (or unit unit) unit)
               (map address bool)
               (pair address timestamp)
               (option (pair address timestamp))
               (list (or (or (or (set address) nat) (or (pair address unit mutez) (option bytes)))
                         (or (set address) (pair address unit mutez)))))
         { CDR ;
           DUP ;
           GET 8 ;
           MAP { IF_LEFT
                   { IF_LEFT
                       { IF_LEFT { LEFT nat } { RIGHT (set address) } ;
                         LEFT (or (pair address unit mutez) (option bytes)) }
                       { IF_LEFT { LEFT (option bytes) } { CDR ; RIGHT (pair address unit mutez) } ;
                         RIGHT (or (set address) nat) } ;
                     LEFT (or (set address) (pair address unit mutez)) }
                   { IF_LEFT { LEFT (pair address unit mutez) } { RIGHT (set address) } ;
                     RIGHT (or (or (set address) nat) (or (pair address unit mutez) (option bytes))) } } ;
           DUP 2 ;
           GET 7 ;
           DUP 3 ;
           GET 5 ;
           DUP 4 ;
           GET 3 ;
           DIG 4 ;
           CAR ;
           PAIR 5 } ;
       SWAP ;
       MAP { DUP 2 ; SWAP ; EXEC } ;
       SWAP ;
       DROP } }
`;
export default contract;
