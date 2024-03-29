const v0_3_3 = `{ parameter
  (or (or (list %create_proposal
             (or (or (or (pair %add_or_update_metadata (string %key) (bytes %value))
                         (set %add_owners address))
                     (or (int %adjust_effective_period) (nat %adjust_threshold)))
                 (or (or (pair %execute_lambda
                            (lambda %lambda unit (list operation))
                            (option %metadata bytes))
                         (string %remove_metadata))
                     (or (set %remove_owners address) (pair %transfer (address %target) (mutez %amount))))))
          (unit %default))
      (or (pair %resolve_proposal
             (list %proposal_contents
                (or (or (or (pair %add_or_update_metadata (string %key) (bytes %value))
                            (set %add_owners address))
                        (or (int %adjust_effective_period) (nat %adjust_threshold)))
                    (or (or (pair %execute_lambda
                               (lambda %lambda unit (list operation))
                               (option %metadata bytes))
                            (string %remove_metadata))
                        (or (set %remove_owners address) (pair %transfer (address %target) (mutez %amount))))))
             (nat %proposal_id))
          (pair %sign_proposal
             (pair (bool %agreement)
                   (list %proposal_contents
                      (or (or (or (pair %add_or_update_metadata (string %key) (bytes %value))
                                  (set %add_owners address))
                              (or (int %adjust_effective_period) (nat %adjust_threshold)))
                          (or (or (pair %execute_lambda
                                     (lambda %lambda unit (list operation))
                                     (option %metadata bytes))
                                  (string %remove_metadata))
                              (or (set %remove_owners address) (pair %transfer (address %target) (mutez %amount)))))))
             (nat %proposal_id)))) ;
storage
  (pair (nat %proposal_counter)
        (big_map %proposals
           nat
           (pair (or %state
                    (or (unit %executed) (unit %expired))
                    (or (unit %proposing) (unit %rejected)))
                 (map %signatures address bool)
                 (pair %proposer (address %actor) (timestamp %timestamp))
                 (option %resolver (pair (address %actor) (timestamp %timestamp)))
                 (list %contents
                    (or (or (or (pair %add_or_update_metadata (string %key) (bytes %value))
                                (set %add_owners address))
                            (or (int %adjust_effective_period) (nat %adjust_threshold)))
                        (or (or (pair %execute_lambda
                                   (lambda %lambda unit (list operation))
                                   (option %metadata bytes))
                                (string %remove_metadata))
                            (or (set %remove_owners address) (pair %transfer (address %target) (mutez %amount))))))))
        (big_map %archives
           nat
           (or (or (unit %executed) (unit %expired)) (or (unit %proposing) (unit %rejected))))
        (set %owners address)
        (nat %threshold)
        (int %effective_period)
        (big_map %metadata string bytes)) ;
code { PUSH string "Threshold must be greater than 1" ;
       PUSH string "No owner to be added or removed" ;
       PUSH string "Effective period should be greater than 0" ;
       LAMBDA
         (pair nat
               nat
               (big_map
                  nat
                  (pair (or (or unit unit) (or unit unit))
                        (map address bool)
                        (pair address timestamp)
                        (option (pair address timestamp))
                        (list (or (or (or (pair string bytes) (set address)) (or int nat))
                                  (or (or (pair (lambda unit (list operation)) (option bytes)) string)
                                      (or (set address) (pair address mutez)))))))
               (big_map nat (or (or unit unit) (or unit unit)))
               (set address)
               nat
               int
               (big_map string bytes))
         (pair (or (or unit unit) (or unit unit))
               (map address bool)
               (pair address timestamp)
               (option (pair address timestamp))
               (list (or (or (or (pair string bytes) (set address)) (or int nat))
                         (or (or (pair (lambda unit (list operation)) (option bytes)) string)
                             (or (set address) (pair address mutez))))))
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
         (pair (pair nat
                     (or (or unit unit) (or unit unit))
                     (map address bool)
                     (pair address timestamp)
                     (option (pair address timestamp))
                     (list (or (or (or (pair string bytes) (set address)) (or int nat))
                               (or (or (pair (lambda unit (list operation)) (option bytes)) string)
                                   (or (set address) (pair address mutez))))))
               nat
               (big_map
                  nat
                  (pair (or (or unit unit) (or unit unit))
                        (map address bool)
                        (pair address timestamp)
                        (option (pair address timestamp))
                        (list (or (or (or (pair string bytes) (set address)) (or int nat))
                                  (or (or (pair (lambda unit (list operation)) (option bytes)) string)
                                      (or (set address) (pair address mutez)))))))
               (big_map nat (or (or unit unit) (or unit unit)))
               (set address)
               nat
               int
               (big_map string bytes))
         (pair nat
               (big_map
                  nat
                  (pair (or (or unit unit) (or unit unit))
                        (map address bool)
                        (pair address timestamp)
                        (option (pair address timestamp))
                        (list (or (or (or (pair string bytes) (set address)) (or int nat))
                                  (or (or (pair (lambda unit (list operation)) (option bytes)) string)
                                      (or (set address) (pair address mutez)))))))
               (big_map nat (or (or unit unit) (or unit unit)))
               (set address)
               nat
               int
               (big_map string bytes))
         { UNPAIR ;
           UNPAIR ;
           DUP 3 ;
           DIG 3 ;
           GET 3 ;
           DIG 3 ;
           SOME ;
           DIG 3 ;
           UPDATE ;
           UPDATE 3 } ;
       LAMBDA
         (pair (pair nat (or (or unit unit) (or unit unit)))
               nat
               (big_map
                  nat
                  (pair (or (or unit unit) (or unit unit))
                        (map address bool)
                        (pair address timestamp)
                        (option (pair address timestamp))
                        (list (or (or (or (pair string bytes) (set address)) (or int nat))
                                  (or (or (pair (lambda unit (list operation)) (option bytes)) string)
                                      (or (set address) (pair address mutez)))))))
               (big_map nat (or (or unit unit) (or unit unit)))
               (set address)
               nat
               int
               (big_map string bytes))
         (pair nat
               (big_map
                  nat
                  (pair (or (or unit unit) (or unit unit))
                        (map address bool)
                        (pair address timestamp)
                        (option (pair address timestamp))
                        (list (or (or (or (pair string bytes) (set address)) (or int nat))
                                  (or (or (pair (lambda unit (list operation)) (option bytes)) string)
                                      (or (set address) (pair address mutez)))))))
               (big_map nat (or (or unit unit) (or unit unit)))
               (set address)
               nat
               int
               (big_map string bytes))
         { UNPAIR ;
           UNPAIR ;
           DUP 3 ;
           DUP 4 ;
           GET 3 ;
           DUP 3 ;
           NONE (pair (or (or unit unit) (or unit unit))
                      (map address bool)
                      (pair address timestamp)
                      (option (pair address timestamp))
                      (list (or (or (or (pair string bytes) (set address)) (or int nat))
                                (or (or (pair (lambda unit (list operation)) (option bytes)) string)
                                    (or (set address) (pair address mutez)))))) ;
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
         (pair (pair string (option bytes))
               nat
               (big_map
                  nat
                  (pair (or (or unit unit) (or unit unit))
                        (map address bool)
                        (pair address timestamp)
                        (option (pair address timestamp))
                        (list (or (or (or (pair string bytes) (set address)) (or int nat))
                                  (or (or (pair (lambda unit (list operation)) (option bytes)) string)
                                      (or (set address) (pair address mutez)))))))
               (big_map nat (or (or unit unit) (or unit unit)))
               (set address)
               nat
               int
               (big_map string bytes))
         (pair nat
               (big_map
                  nat
                  (pair (or (or unit unit) (or unit unit))
                        (map address bool)
                        (pair address timestamp)
                        (option (pair address timestamp))
                        (list (or (or (or (pair string bytes) (set address)) (or int nat))
                                  (or (or (pair (lambda unit (list operation)) (option bytes)) string)
                                      (or (set address) (pair address mutez)))))))
               (big_map nat (or (or unit unit) (or unit unit)))
               (set address)
               nat
               int
               (big_map string bytes))
         { UNPAIR ;
           UNPAIR ;
           DUP 3 ;
           DIG 3 ;
           GET 12 ;
           DIG 3 ;
           DIG 3 ;
           UPDATE ;
           UPDATE 12 } ;
       LAMBDA
         (pair nat
               (big_map
                  nat
                  (pair (or (or unit unit) (or unit unit))
                        (map address bool)
                        (pair address timestamp)
                        (option (pair address timestamp))
                        (list (or (or (or (pair string bytes) (set address)) (or int nat))
                                  (or (or (pair (lambda unit (list operation)) (option bytes)) string)
                                      (or (set address) (pair address mutez)))))))
               (big_map nat (or (or unit unit) (or unit unit)))
               (set address)
               nat
               int
               (big_map string bytes))
         unit
         { PUSH string "Only the contract owners can perform this operation" ;
           SWAP ;
           GET 7 ;
           SENDER ;
           MEM ;
           IF { DROP ; UNIT } { FAILWITH } } ;
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
         (pair (list (or (or (or (pair string bytes) (set address)) (or int nat))
                         (or (or (pair (lambda unit (list operation)) (option bytes)) string)
                             (or (set address) (pair address mutez)))))
               (list (or (or (or (pair string bytes) (set address)) (or int nat))
                         (or (or (pair (lambda unit (list operation)) (option bytes)) string)
                             (or (set address) (pair address mutez))))))
         unit
         { UNPAIR ;
           PACK ;
           SWAP ;
           PACK ;
           SWAP ;
           COMPARE ;
           EQ ;
           IF { UNIT } { PUSH string "The proposal content doesn't match" ; FAILWITH } } ;
       DIG 10 ;
       UNPAIR ;
       IF_LEFT
         { DIG 2 ;
           DIG 5 ;
           DIG 6 ;
           DIG 7 ;
           DIG 8 ;
           DROP 5 ;
           IF_LEFT
             { DUP 2 ;
               DIG 4 ;
               SWAP ;
               EXEC ;
               DROP ;
               AMOUNT ;
               DIG 3 ;
               SWAP ;
               EXEC ;
               DROP ;
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
                                { DROP }
                                { PUSH nat 0 ;
                                  SWAP ;
                                  SIZE ;
                                  COMPARE ;
                                  GT ;
                                  IF {} { DUP 4 ; FAILWITH } } }
                            { IF_LEFT
                                { PUSH int 0 ; SWAP ; COMPARE ; GT ; IF {} { DUP 3 ; FAILWITH } }
                                { PUSH nat 0 ; SWAP ; COMPARE ; GT ; IF {} { DUP 5 ; FAILWITH } } } }
                        { IF_LEFT
                            { IF_LEFT { DROP } { DROP } }
                            { IF_LEFT
                                { PUSH nat 0 ;
                                  SWAP ;
                                  SIZE ;
                                  COMPARE ;
                                  GT ;
                                  IF {} { DUP 4 ; FAILWITH } }
                                { PUSH mutez 0 ;
                                  SWAP ;
                                  CDR ;
                                  COMPARE ;
                                  EQ ;
                                  NOT ;
                                  IF {} { PUSH string "Amount should be greater than zero" ; FAILWITH } } } } } ;
               DIG 3 ;
               DROP ;
               NONE (pair address timestamp) ;
               NOW ;
               SENDER ;
               PAIR ;
               EMPTY_MAP address bool ;
               UNIT ;
               LEFT unit ;
               RIGHT (or unit unit) ;
               PAIR 5 ;
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
               UPDATE 1 ;
               DUP ;
               CAR ;
               EMIT %create_proposal nat }
             { DIG 2 ;
               DIG 3 ;
               DIG 5 ;
               DROP 4 ;
               SENDER ;
               AMOUNT ;
               PAIR ;
               EMIT %receiving_tez (pair (mutez %amount) (address %from)) } ;
           SWAP ;
           NIL operation }
         { DIG 10 ;
           DROP ;
           IF_LEFT
             { UNPAIR ;
               DUP 3 ;
               DIG 6 ;
               SWAP ;
               EXEC ;
               DROP ;
               AMOUNT ;
               DIG 5 ;
               SWAP ;
               EXEC ;
               DROP ;
               DUP 3 ;
               DUP 3 ;
               PAIR ;
               DIG 8 ;
               SWAP ;
               EXEC ;
               DUP ;
               GET 8 ;
               DIG 2 ;
               PAIR ;
               DIG 4 ;
               SWAP ;
               EXEC ;
               DROP ;
               DUP 3 ;
               GET 11 ;
               DUP 2 ;
               GET 5 ;
               CDR ;
               ADD ;
               DUP 4 ;
               GET 7 ;
               DUP 5 ;
               GET 9 ;
               NOW ;
               DIG 3 ;
               COMPARE ;
               LT ;
               IF { DIG 2 ;
                    UNIT ;
                    RIGHT unit ;
                    LEFT (or unit unit) ;
                    UPDATE 1 ;
                    NOW ;
                    SENDER ;
                    PAIR ;
                    SOME ;
                    UPDATE 7 }
                  { DIG 2 } ;
               UNIT ;
               RIGHT unit ;
               LEFT (or unit unit) ;
               DUP 2 ;
               CAR ;
               COMPARE ;
               EQ ;
               IF { SWAP ; DIG 2 ; DROP 2 }
                  { DUP ;
                    EMPTY_MAP address bool ;
                    DUP 5 ;
                    ITER { SWAP ;
                           DUP 4 ;
                           GET 3 ;
                           DUP 3 ;
                           GET ;
                           IF_NONE { SWAP ; DROP } { DIG 2 ; SWAP ; SOME ; SWAP ; UPDATE } } ;
                    DIG 2 ;
                    DROP ;
                    UPDATE 3 ;
                    PUSH nat 0 ;
                    PUSH nat 0 ;
                    PAIR ;
                    DUP 2 ;
                    GET 3 ;
                    ITER { CDR ;
                           SWAP ;
                           UNPAIR ;
                           DIG 2 ;
                           IF { SWAP ; PUSH nat 1 ; DIG 2 ; ADD }
                              { PUSH nat 1 ; DIG 2 ; ADD ; SWAP } ;
                           PAIR } ;
                    UNPAIR ;
                    UNIT ;
                    LEFT unit ;
                    RIGHT (or unit unit) ;
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
                         LEFT (or unit unit) ;
                         UPDATE 1 ;
                         NOW ;
                         SENDER ;
                         PAIR ;
                         SOME ;
                         UPDATE 7 }
                       { SWAP } ;
                    DIG 2 ;
                    DIG 3 ;
                    SIZE ;
                    SUB ;
                    ABS ;
                    DUG 2 ;
                    UNIT ;
                    LEFT unit ;
                    RIGHT (or unit unit) ;
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
                         RIGHT unit ;
                         RIGHT (or unit unit) ;
                         UPDATE 1 ;
                         NOW ;
                         SENDER ;
                         PAIR ;
                         SOME ;
                         UPDATE 7 }
                       {} } ;
               PUSH string "No enough signature to resolve the proposal" ;
               UNIT ;
               LEFT unit ;
               RIGHT (or unit unit) ;
               DUP 3 ;
               CAR ;
               COMPARE ;
               EQ ;
               NOT ;
               IF { DROP } { FAILWITH } ;
               DIG 2 ;
               DUP 2 ;
               DUP 4 ;
               PAIR ;
               PAIR ;
               DIG 5 ;
               SWAP ;
               EXEC ;
               DUP 2 ;
               CAR ;
               IF_LEFT
                 { IF_LEFT
                     { DROP ;
                       NIL operation ;
                       PAIR ;
                       DUP 2 ;
                       GET 8 ;
                       ITER { SWAP ;
                              UNPAIR ;
                              DIG 2 ;
                              IF_LEFT
                                { IF_LEFT
                                    { IF_LEFT
                                        { UNPAIR ;
                                          DIG 3 ;
                                          DIG 2 ;
                                          SOME ;
                                          DIG 2 ;
                                          PAIR ;
                                          PAIR ;
                                          DUP 5 ;
                                          SWAP ;
                                          EXEC }
                                        { DUP 3 ;
                                          DIG 3 ;
                                          GET 7 ;
                                          DIG 2 ;
                                          ITER { PUSH bool True ; SWAP ; UPDATE } ;
                                          UPDATE 7 } }
                                    { IF_LEFT { DIG 2 ; SWAP ; UPDATE 11 } { DIG 2 ; SWAP ; UPDATE 9 } } ;
                                  NIL operation }
                                { IF_LEFT
                                    { IF_LEFT
                                        { DIG 2 ; UNIT ; DIG 2 ; CAR ; SWAP ; EXEC }
                                        { DIG 2 ;
                                          NONE bytes ;
                                          DIG 2 ;
                                          PAIR ;
                                          PAIR ;
                                          DUP 5 ;
                                          SWAP ;
                                          EXEC ;
                                          NIL operation } }
                                    { IF_LEFT
                                        { DUP 3 ;
                                          DIG 3 ;
                                          GET 7 ;
                                          DIG 2 ;
                                          ITER { PUSH bool False ; SWAP ; UPDATE } ;
                                          UPDATE 7 ;
                                          NIL operation }
                                        { DIG 2 ;
                                          NIL operation ;
                                          DIG 2 ;
                                          UNPAIR ;
                                          CONTRACT unit ;
                                          IF_NONE { PUSH string "Unknown contract" ; FAILWITH } {} ;
                                          SWAP ;
                                          UNIT ;
                                          TRANSFER_TOKENS ;
                                          CONS } } } ;
                              DIG 2 ;
                              NIL operation ;
                              SWAP ;
                              ITER { CONS } ;
                              ITER { CONS } ;
                              PAIR } ;
                       DIG 3 ;
                       DROP ;
                       UNPAIR ;
                       SWAP ;
                       UNIT ;
                       LEFT unit ;
                       LEFT (or unit unit) ;
                       DUP 5 ;
                       PAIR ;
                       PAIR ;
                       DIG 4 ;
                       SWAP ;
                       EXEC ;
                       SWAP }
                     { DIG 4 ;
                       DROP 2 ;
                       UNIT ;
                       RIGHT unit ;
                       LEFT (or unit unit) ;
                       DUP 4 ;
                       PAIR ;
                       PAIR ;
                       DIG 3 ;
                       SWAP ;
                       EXEC ;
                       NIL operation } }
                 { DIG 4 ;
                   DROP ;
                   IF_LEFT
                     { DIG 4 ; DROP 2 }
                     { DROP ;
                       UNIT ;
                       RIGHT unit ;
                       RIGHT (or unit unit) ;
                       DUP 4 ;
                       PAIR ;
                       PAIR ;
                       DIG 3 ;
                       SWAP ;
                       EXEC } ;
                   NIL operation } ;
               DUP 3 ;
               CAR ;
               DUP 5 ;
               PAIR ;
               EMIT %resolve_proposal
                 (pair (nat %proposal_id)
                       (or %proposal_state
                          (or (unit %executed) (unit %expired))
                          (or (unit %proposing) (unit %rejected)))) ;
               DIG 4 ;
               DIG 4 ;
               PACK ;
               PAIR ;
               EMIT %archive_proposal (pair (bytes %proposal) (nat %proposal_id)) ;
               DIG 3 ;
               DIG 3 ;
               DIG 2 ;
               CONS }
             { DIG 5 ;
               DIG 6 ;
               DROP 2 ;
               UNPAIR ;
               UNPAIR ;
               DUP 4 ;
               DIG 7 ;
               SWAP ;
               EXEC ;
               DROP ;
               AMOUNT ;
               DIG 6 ;
               SWAP ;
               EXEC ;
               DROP ;
               DUP 4 ;
               DUP 4 ;
               PAIR ;
               DIG 7 ;
               SWAP ;
               EXEC ;
               PUSH string "You have already signed this proposal" ;
               DUP 2 ;
               GET 3 ;
               SENDER ;
               MEM ;
               NOT ;
               IF { DROP } { FAILWITH } ;
               PUSH string "The proposal has passed its expiration time" ;
               NOW ;
               DUP 7 ;
               GET 11 ;
               DUP 4 ;
               GET 5 ;
               CDR ;
               ADD ;
               COMPARE ;
               GT ;
               IF { DROP } { FAILWITH } ;
               DUP ;
               GET 8 ;
               DIG 3 ;
               PAIR ;
               DIG 5 ;
               SWAP ;
               EXEC ;
               DROP ;
               SENDER ;
               DIG 4 ;
               DUP 3 ;
               DIG 3 ;
               GET 3 ;
               DUP 5 ;
               SOME ;
               DUP 5 ;
               UPDATE ;
               UPDATE 3 ;
               DUP 5 ;
               PAIR ;
               PAIR ;
               DIG 4 ;
               SWAP ;
               EXEC ;
               SWAP ;
               DIG 3 ;
               DIG 3 ;
               PAIR ;
               PAIR ;
               EMIT %sign_proposal
                 (pair (pair (bool %agreement) (nat %proposal_id)) (address %signer)) ;
               SWAP ;
               NIL operation } } ;
       DIG 2 ;
       CONS ;
       PUSH nat 0 ;
       DUP 3 ;
       GET 7 ;
       SIZE ;
       COMPARE ;
       GT ;
       IF {}
          { PUSH string "Require at least one owner in the contract" ; FAILWITH } ;
       DUP 2 ;
       GET 9 ;
       DUP 3 ;
       GET 7 ;
       SIZE ;
       COMPARE ;
       GE ;
       IF {}
          { PUSH string "Number of owner should be greater than threshold" ; FAILWITH } ;
       PUSH nat 0 ;
       DUP 3 ;
       GET 9 ;
       COMPARE ;
       GT ;
       IF { DIG 3 ; DROP } { DIG 3 ; FAILWITH } ;
       PUSH int 0 ;
       DUP 3 ;
       GET 11 ;
       COMPARE ;
       GT ;
       IF { DIG 2 ; DROP } { DIG 2 ; FAILWITH } ;
       PAIR } }

`;
export default v0_3_3;
