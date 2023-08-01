const contract = `
{ parameter
    (or (or (list %create_proposal
               (or (or (or (set %add_owners address) (int %adjust_effective_period))
                       (or (nat %adjust_threshold)
                           (pair %execute (address %target) (unit %parameter) (mutez %amount))))
                   (or (or (pair %execute_lambda
                              (option %lambda (lambda unit operation))
                              (option %metadata bytes))
                           (set %remove_owners address))
                       (pair %transfer (address %target) (unit %parameter) (mutez %amount)))))
            (unit %default))
        (or (pair %proof_of_event_challenge (bytes %challenge_id) (bytes %payload))
            (pair %sign_proposal
               (pair bytes
                     (list (or (or (or (set %add_owners address) (int %adjust_effective_period))
                                   (or (nat %adjust_threshold)
                                       (pair %execute (address %target) (unit %parameter) (mutez %amount))))
                               (or (or (pair %execute_lambda
                                          (option %lambda (lambda unit operation))
                                          (option %metadata bytes))
                                       (set %remove_owners address))
                                   (pair %transfer (address %target) (unit %parameter) (mutez %amount))))))
               bool))) ;
  storage
    (pair (nat %proposal_counter)
          (big_map %proposals
             bytes
             (pair (or %state
                      (or (unit %executed) (unit %expired))
                      (or (unit %proposing) (unit %rejected)))
                   (map %signatures address bool)
                   (pair %proposer (address %actor) (timestamp %timestamp))
                   (option %resolver (pair (address %actor) (timestamp %timestamp)))
                   (list %contents
                      (or (or (or (set %add_owners address) (int %adjust_effective_period))
                              (or (nat %adjust_threshold)
                                  (pair %execute (address %target) (unit %parameter) (mutez %amount))))
                          (or (or (pair %execute_lambda
                                     (option %lambda (lambda unit operation))
                                     (option %metadata bytes))
                                  (set %remove_owners address))
                              (pair %transfer (address %target) (unit %parameter) (mutez %amount)))))))
          (set %owners address)
          (nat %threshold)
          (int %effective_period)
          (big_map %metadata string bytes)) ;
  code { PUSH string "Only the contract owners can perform this operation" ;
         PUSH string "No proposal exists for this counter" ;
         PUSH string "Unknown contract" ;
         PUSH string "Threshold must be greater than 1" ;
         PUSH string "There is no content in proposal" ;
         PUSH string "No owner to be added or removed" ;
         PUSH string "The proposal content doesn't match" ;
         PUSH string "Effective period should be greater than 0" ;
         NIL operation ;
         DIG 9 ;
         UNPAIR ;
         IF_LEFT
           { DIG 2 ;
             DIG 4 ;
             DIG 8 ;
             DIG 9 ;
             DROP 4 ;
             IF_LEFT
               { DIG 6 ;
                 DUP 3 ;
                 GET 5 ;
                 SENDER ;
                 MEM ;
                 IF { DROP } { FAILWITH } ;
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
                 IF {} { DUP 5 ; FAILWITH } ;
                 DUP ;
                 ITER { IF_LEFT
                          { IF_LEFT
                              { IF_LEFT
                                  { PUSH nat 0 ;
                                    SWAP ;
                                    SIZE ;
                                    COMPARE ;
                                    GT ;
                                    IF {} { DUP 4 ; FAILWITH } }
                                  { PUSH int 0 ; SWAP ; COMPARE ; GT ; IF {} { DUP 3 ; FAILWITH } } }
                              { IF_LEFT
                                  { PUSH nat 0 ; SWAP ; COMPARE ; GT ; IF {} { DUP 6 ; FAILWITH } }
                                  { DROP } } }
                          { IF_LEFT
                              { IF_LEFT
                                  { CAR ;
                                    IF_NONE { PUSH bool False } { DROP ; PUSH bool True } ;
                                    IF {} { DUP 5 ; FAILWITH } }
                                  { PUSH nat 0 ;
                                    SWAP ;
                                    SIZE ;
                                    COMPARE ;
                                    GT ;
                                    IF {} { DUP 4 ; FAILWITH } } }
                              { PUSH mutez 0 ;
                                SWAP ;
                                GET 4 ;
                                COMPARE ;
                                EQ ;
                                NOT ;
                                IF {} { PUSH string "Amount should be greater than zero" ; FAILWITH } } } } ;
                 DIG 3 ;
                 DIG 4 ;
                 DROP 2 ;
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
                 GET 3 ;
                 DUP 3 ;
                 DUP 3 ;
                 BYTES ;
                 PAIR 3 ;
                 DIG 3 ;
                 SWAP ;
                 UNPAIR 3 ;
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
                 BYTES ;
                 PAIR ;
                 EMIT %create_proposal
                   (pair bytes
                         (or %state
                            (or (unit %executed) (unit %expired))
                            (or (unit %proposing) (unit %rejected)))
                         (map %signatures address bool)
                         (pair %proposer (address %actor) (timestamp %timestamp))
                         (option %resolver (pair (address %actor) (timestamp %timestamp)))
                         (list %contents
                            (or (or (or (set %add_owners address) (int %adjust_effective_period))
                                    (or (nat %adjust_threshold)
                                        (pair %execute (address %target) (unit %parameter) (mutez %amount))))
                                (or (or (pair %execute_lambda
                                           (option %lambda (lambda unit operation))
                                           (option %metadata bytes))
                                        (set %remove_owners address))
                                    (pair %transfer (address %target) (unit %parameter) (mutez %amount)))))) }
               { DIG 3 ;
                 DIG 4 ;
                 DIG 6 ;
                 DROP 4 ;
                 AMOUNT ;
                 SENDER ;
                 PAIR ;
                 EMIT %receiving_tez (pair address mutez) } ;
             SWAP ;
             NIL operation }
           { DIG 5 ;
             DIG 6 ;
             DROP 2 ;
             IF_LEFT
               { UNPAIR ;
                 DIG 9 ;
                 DUP 4 ;
                 GET 5 ;
                 SENDER ;
                 MEM ;
                 IF { DROP } { FAILWITH } ;
                 AMOUNT ;
                 PUSH mutez 0 ;
                 SWAP ;
                 COMPARE ;
                 EQ ;
                 IF {}
                    { PUSH string "You must not send tez to the smart contract" ; FAILWITH } ;
                 DUP 3 ;
                 GET 3 ;
                 DUP 2 ;
                 GET ;
                 IF_NONE { DIG 8 ; FAILWITH } { DIG 9 ; DROP } ;
                 PUSH string "This proposal has been resolved" ;
                 UNIT ;
                 LEFT unit ;
                 RIGHT (or unit unit) ;
                 DUP 3 ;
                 CAR ;
                 COMPARE ;
                 EQ ;
                 IF { DROP } { FAILWITH } ;
                 DUP ;
                 GET 8 ;
                 PACK ;
                 DUP 4 ;
                 COMPARE ;
                 EQ ;
                 IF { DIG 6 ; DROP } { DIG 6 ; FAILWITH } ;
                 SENDER ;
                 DUP 5 ;
                 GET 9 ;
                 DUP 3 ;
                 GET 5 ;
                 CDR ;
                 ADD ;
                 DUP 6 ;
                 GET 5 ;
                 DUP 7 ;
                 GET 7 ;
                 NOW ;
                 DIG 3 ;
                 COMPARE ;
                 LT ;
                 IF { DIG 3 ;
                      UNIT ;
                      RIGHT unit ;
                      LEFT (or unit unit) ;
                      UPDATE 1 ;
                      NOW ;
                      SENDER ;
                      PAIR ;
                      SOME ;
                      UPDATE 7 }
                    { DIG 3 } ;
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
                 DUP 5 ;
                 DIG 5 ;
                 GET 3 ;
                 DUP 3 ;
                 SOME ;
                 DUP 6 ;
                 UPDATE ;
                 UPDATE 3 ;
                 DUP 2 ;
                 CAR ;
                 IF_LEFT
                   { IF_LEFT
                       { DROP ;
                         NIL (or (or (or (set address) int) (or nat (pair address unit mutez)))
                                 (or (or (pair (option (lambda unit operation)) (option bytes)) (set address))
                                     (pair address unit mutez))) ;
                         DIG 6 ;
                         PAIR ;
                         PAIR ;
                         DUP 2 ;
                         GET 8 ;
                         ITER { SWAP ;
                                UNPAIR ;
                                UNPAIR ;
                                DUP 4 ;
                                IF_LEFT
                                  { IF_LEFT
                                      { IF_LEFT
                                          { DUP 4 ;
                                            DIG 4 ;
                                            GET 5 ;
                                            DIG 2 ;
                                            ITER { PUSH bool True ; SWAP ; UPDATE } ;
                                            UPDATE 5 }
                                          { DIG 3 ; SWAP ; UPDATE 9 } ;
                                        DIG 3 ;
                                        NONE operation }
                                      { IF_LEFT
                                          { DIG 3 ; SWAP ; UPDATE 7 ; DIG 3 ; NONE operation }
                                          { DIG 3 ;
                                            DIG 4 ;
                                            DUP 3 ;
                                            CAR ;
                                            CONTRACT unit ;
                                            IF_NONE { DUP 12 ; FAILWITH } {} ;
                                            DUP 4 ;
                                            GET 4 ;
                                            DIG 4 ;
                                            GET 3 ;
                                            TRANSFER_TOKENS ;
                                            SOME } } }
                                  { IF_LEFT
                                      { IF_LEFT
                                          { DIG 4 ;
                                            DROP ;
                                            DUP ;
                                            NONE (lambda unit operation) ;
                                            UPDATE 1 ;
                                            LEFT (set address) ;
                                            LEFT (pair address unit mutez) ;
                                            RIGHT (or (or (set address) int) (or nat (pair address unit mutez))) ;
                                            DIG 4 ;
                                            SWAP ;
                                            DIG 2 ;
                                            CAR ;
                                            MAP { UNIT ; EXEC } }
                                          { DUP 4 ;
                                            DIG 4 ;
                                            GET 5 ;
                                            DIG 2 ;
                                            ITER { PUSH bool False ; SWAP ; UPDATE } ;
                                            UPDATE 5 ;
                                            DIG 3 ;
                                            NONE operation } }
                                      { DIG 3 ;
                                        DIG 4 ;
                                        DUP 3 ;
                                        CAR ;
                                        CONTRACT unit ;
                                        IF_NONE { DUP 12 ; FAILWITH } {} ;
                                        DUP 4 ;
                                        GET 4 ;
                                        DIG 4 ;
                                        GET 3 ;
                                        TRANSFER_TOKENS ;
                                        SOME } } ;
                                IF_NONE
                                  { SWAP ; DIG 3 ; DIG 2 ; CONS ; DIG 2 }
                                  { DIG 2 ; DIG 4 ; DIG 3 ; CONS ; DIG 3 ; DIG 3 ; CONS } ;
                                PAIR ;
                                PAIR } ;
                         DIG 7 ;
                         DROP ;
                         UNPAIR ;
                         UNPAIR ;
                         NIL operation ;
                         SWAP ;
                         ITER { CONS } ;
                         NIL (or (or (or (set address) int) (or nat (pair address unit mutez)))
                                 (or (or (pair (option (lambda unit operation)) (option bytes)) (set address))
                                     (pair address unit mutez))) ;
                         DIG 2 ;
                         ITER { CONS } ;
                         DIG 2 ;
                         DIG 3 ;
                         DIG 2 ;
                         UPDATE 8 ;
                         DIG 2 }
                       { DIG 9 ;
                         DROP 2 ;
                         DUP 2 ;
                         DIG 2 ;
                         GET 8 ;
                         MAP { DUP ;
                               IF_LEFT
                                 { IF_LEFT
                                     { IF_LEFT { DROP } { DROP } }
                                     { IF_LEFT { DROP } { DROP } } }
                                 { IF_LEFT
                                     { IF_LEFT
                                         { SWAP ;
                                           DROP ;
                                           NONE (lambda unit operation) ;
                                           UPDATE 1 ;
                                           LEFT (set address) ;
                                           LEFT (pair address unit mutez) ;
                                           RIGHT (or (or (set address) int) (or nat (pair address unit mutez))) }
                                         { DROP } }
                                     { DROP } } } ;
                         UPDATE 8 ;
                         DIG 5 } }
                   { DIG 9 ;
                     DROP ;
                     IF_LEFT
                       { DROP }
                       { DROP ;
                         DUP 2 ;
                         DIG 2 ;
                         GET 8 ;
                         MAP { DUP ;
                               IF_LEFT
                                 { IF_LEFT
                                     { IF_LEFT { DROP } { DROP } }
                                     { IF_LEFT { DROP } { DROP } } }
                                 { IF_LEFT
                                     { IF_LEFT
                                         { SWAP ;
                                           DROP ;
                                           NONE (lambda unit operation) ;
                                           UPDATE 1 ;
                                           LEFT (set address) ;
                                           LEFT (pair address unit mutez) ;
                                           RIGHT (or (or (set address) int) (or nat (pair address unit mutez))) }
                                         { DROP } }
                                     { DROP } } } ;
                         UPDATE 8 ;
                         SWAP } ;
                     SWAP ;
                     DIG 5 } ;
                 DIG 3 ;
                 DUP 5 ;
                 PAIR ;
                 EMIT %resolve_proposal (pair bytes address) ;
                 DIG 5 ;
                 DUP 6 ;
                 PAIR ;
                 EMIT %proof_of_event (pair bytes bytes) ;
                 DUP 5 ;
                 DIG 5 ;
                 GET 3 ;
                 DIG 5 ;
                 SOME ;
                 DIG 6 ;
                 UPDATE ;
                 UPDATE 3 ;
                 DIG 3 ;
                 DIG 3 ;
                 CONS }
               { DIG 2 ;
                 DIG 6 ;
                 DROP 2 ;
                 UNPAIR ;
                 UNPAIR ;
                 DIG 8 ;
                 DUP 5 ;
                 GET 5 ;
                 SENDER ;
                 MEM ;
                 IF { DROP } { FAILWITH } ;
                 AMOUNT ;
                 PUSH mutez 0 ;
                 SWAP ;
                 COMPARE ;
                 EQ ;
                 IF {}
                    { PUSH string "You must not send tez to the smart contract" ; FAILWITH } ;
                 DUP 4 ;
                 GET 3 ;
                 DUP 2 ;
                 GET ;
                 IF_NONE { DIG 7 ; FAILWITH } { DIG 8 ; DROP } ;
                 PUSH string "This proposal has been resolved" ;
                 UNIT ;
                 LEFT unit ;
                 RIGHT (or unit unit) ;
                 DUP 3 ;
                 CAR ;
                 COMPARE ;
                 EQ ;
                 IF { DROP } { FAILWITH } ;
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
                 GET 9 ;
                 DUP 4 ;
                 GET 5 ;
                 CDR ;
                 ADD ;
                 COMPARE ;
                 GT ;
                 IF { DROP } { FAILWITH } ;
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
                 DUP 4 ;
                 DUP 2 ;
                 DUP 5 ;
                 PAIR ;
                 PAIR ;
                 EMIT %sign_proposal (pair (pair bytes address) bool) ;
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
                 NIL operation } } ;
         DIG 2 ;
         CONS ;
         PUSH nat 0 ;
         DUP 3 ;
         GET 5 ;
         SIZE ;
         COMPARE ;
         GT ;
         IF {}
            { PUSH string "Require at least one owner in the contract" ; FAILWITH } ;
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
         IF { DIG 3 ; DROP } { DIG 3 ; FAILWITH } ;
         PUSH int 0 ;
         DUP 3 ;
         GET 9 ;
         COMPARE ;
         GT ;
         IF { DIG 2 ; DROP } { DIG 2 ; FAILWITH } ;
         PAIR } }
`;
export default contract;
