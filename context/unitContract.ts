const contract = `{ parameter
  (or (or (list %create_proposal
             (or (pair %execute (address %target) (unit %parameter) (mutez %amount))
                 (pair %transfer (address %target) (unit %parameter) (mutez %amount))))
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
                    (or (pair %execute (address %target) (unit %parameter) (mutez %amount))
                        (pair %transfer (address %target) (unit %parameter) (mutez %amount))))))
        (set %signers address)
        (nat %threshold)
        (big_map %metadata string bytes)) ;
code { PUSH string "Only the contract signers can perform this operation" ;
       PUSH string "Unknown contract" ;
       NIL operation ;
       DIG 3 ;
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
       IF {} { PUSH string "Threshold must be greater than 1" ; FAILWITH } ;
       IF_LEFT
         { DIG 3 ;
           DROP ;
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
                  { PUSH string "You must not send Tezos to the smart contract" ; FAILWITH } ;
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
             { DIG 3 ; DROP 2 } }
         { DUP 2 ;
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
           DUP ;
           GET 5 ;
           IF { DIG 3 ;
                DROP ;
                DUP ;
                GET 10 ;
                MAP { IF_LEFT
                        { DUP ;
                          CAR ;
                          CONTRACT unit ;
                          IF_NONE { DUP 5 ; FAILWITH } {} ;
                          DUP 2 ;
                          GET 4 ;
                          DIG 2 ;
                          GET 3 ;
                          TRANSFER_TOKENS }
                        { DUP ;
                          CAR ;
                          CONTRACT unit ;
                          IF_NONE { DUP 5 ; FAILWITH } {} ;
                          DUP 2 ;
                          GET 4 ;
                          DIG 2 ;
                          GET 3 ;
                          TRANSFER_TOKENS } } ;
                DIG 4 ;
                DROP }
              { DIG 4 ; DROP ; DIG 3 } ;
           DUP 4 ;
           DIG 4 ;
           GET 3 ;
           DIG 3 ;
           SOME ;
           DIG 4 ;
           UPDATE ;
           UPDATE 3 } ;
       SWAP ;
       PAIR } }`
export default contract
