const contract = `{ parameter
  (or (or (list %create_proposal
             (or (or (or (set %add_signers address) (nat %adjust_threshold))
                     (or (pair %execute (address %target) (unit %parameter) (mutez %amount))
                         (lambda %execute_lambda unit operation)))
                 (or (set %remove_signers address)
                     (pair %transfer (address %target) (unit %parameter) (mutez %amount)))))
          (unit %default))
      (nat %sign_proposal)) ;
storage
  (pair (nat %proposal_counter)
        (big_map %proposal_map
           nat
           (pair (set %approved_signers address)
                 (address %proposer)
                 (bool %executed)
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
       PUSH string "Unknown contract" ;
       PUSH string "Threshold must be greater than 1" ;
       NIL operation ;
       DIG 4 ;
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
         { DIG 4 ;
           DROP ;
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
               DUP ;
               ITER { IF_LEFT
                        { IF_LEFT
                            { IF_LEFT
                                { DROP }
                                { PUSH nat 0 ; SWAP ; COMPARE ; GT ; IF {} { DUP 4 ; FAILWITH } } }
                            { IF_LEFT { DROP } { DROP } } }
                        { IF_LEFT { DROP } { DROP } } } ;
               DIG 3 ;
               DROP ;
               NOW ;
               PUSH nat 0 ;
               PUSH bool False ;
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
               DIG 3 ;
               DUP 4 ;
               SWAP ;
               SOME ;
               SWAP ;
               UPDATE ;
               UPDATE 3 ;
               SWAP ;
               UPDATE 1 }
             { DIG 3 ; DIG 4 ; DROP 3 } ;
           SWAP ;
           PAIR }
         { DIG 3 ;
           DROP ;
           DUP 2 ;
           GET 5 ;
           SENDER ;
           MEM ;
           IF { DIG 4 ; DROP } { DIG 4 ; FAILWITH } ;
           DUP 2 ;
           GET 3 ;
           DUP 2 ;
           GET ;
           IF_NONE { PUSH string "No proposal exists for this counter" ; FAILWITH } {} ;
           DUP ;
           GET 5 ;
           NOT ;
           IF {} { PUSH string "This proposal has been executed" ; FAILWITH } ;
           DUP ;
           CAR ;
           SENDER ;
           MEM ;
           NOT ;
           IF {} { PUSH string "You have already signed this proposal" ; FAILWITH } ;
           DUP 3 ;
           GET 7 ;
           SENDER ;
           DIG 2 ;
           DUP ;
           CAR ;
           DIG 2 ;
           PUSH bool True ;
           SWAP ;
           UPDATE ;
           DUP 2 ;
           DUP 2 ;
           UPDATE 1 ;
           PUSH nat 1 ;
           DUP 4 ;
           GET 7 ;
           ADD ;
           UPDATE 7 ;
           DIG 2 ;
           GET 5 ;
           DIG 3 ;
           DIG 3 ;
           SIZE ;
           COMPARE ;
           GE ;
           OR ;
           UPDATE 5 ;
           DUP 3 ;
           DIG 3 ;
           GET 3 ;
           DUP 3 ;
           SOME ;
           DIG 4 ;
           UPDATE ;
           UPDATE 3 ;
           DUP 2 ;
           GET 5 ;
           IF { DIG 2 ;
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
                                   IF_NONE { DUP 4 ; FAILWITH } {} ;
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
                               IF_NONE { DUP 4 ; FAILWITH } {} ;
                               DUP 3 ;
                               GET 4 ;
                               DIG 3 ;
                               GET 3 ;
                               TRANSFER_TOKENS ;
                               SOME } } ;
                       IF_NONE { SWAP } { SWAP ; DUG 2 ; CONS } ;
                       PAIR } ;
                SWAP ;
                DROP }
              { SWAP ; DIG 3 ; DROP 2 ; SWAP ; PAIR } } } }`
export default contract
