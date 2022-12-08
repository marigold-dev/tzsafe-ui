const contract = `{ parameter
    (or (or (or %create_proposal
               (pair %raw_execute (address %target) (unit %parameter) (mutez %amount))
               (pair %raw_transfer (address %target) (unit %parameter) (mutez %amount)))
            (unit %default))
        (nat %sign_proposal)) ;
  storage
    (pair (nat %proposal_counter)
          (big_map %proposal_map
             nat
             (or (pair %execute
                    (set %approved_signers address)
                    (address %proposer)
                    (bool %executed)
                    (nat %number_of_signer)
                    (address %target)
                    (unit %parameter)
                    (mutez %amount)
                    (timestamp %timestamp))
                 (pair %transfer
                    (set %approved_signers address)
                    (address %proposer)
                    (bool %executed)
                    (nat %number_of_signer)
                    (address %target)
                    (unit %parameter)
                    (mutez %amount)
                    (timestamp %timestamp))))
          (set %signers address)
          (nat %threshold)
          (big_map %metadata string bytes)) ;
  code { PUSH string "Only the contract signers can perform this operation" ;
         PUSH string "You have already signed this proposal" ;
         PUSH string "Unknown contract" ;
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
         IF {} { PUSH string "Threshold must be greater than 1" ; FAILWITH } ;
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
                    { PUSH string "You must not send Tezos to the smart contract" ; FAILWITH } ;
                 DUP ;
                 IF_LEFT
                   { CAR ;
                     CONTRACT unit ;
                     IF_NONE { DIG 3 ; FAILWITH } { DIG 4 ; DROP 2 } }
                   { CAR ;
                     CONTRACT unit ;
                     IF_NONE { DIG 3 ; FAILWITH } { DIG 4 ; DROP 2 } } ;
                 IF_LEFT
                   { NOW ;
                     DUP 2 ;
                     GET 4 ;
                     DUP 3 ;
                     GET 3 ;
                     DIG 3 ;
                     CAR ;
                     PUSH nat 0 ;
                     PUSH bool False ;
                     SENDER ;
                     EMPTY_SET address ;
                     PAIR 8 ;
                     LEFT (pair (set address) address bool nat address unit mutez timestamp) }
                   { NOW ;
                     DUP 2 ;
                     GET 4 ;
                     DUP 3 ;
                     GET 3 ;
                     DIG 3 ;
                     CAR ;
                     PUSH nat 0 ;
                     PUSH bool False ;
                     SENDER ;
                     EMPTY_SET address ;
                     PAIR 8 ;
                     RIGHT (pair (set address) address bool nat address unit mutez timestamp) } ;
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
               { DIG 3 ; DIG 4 ; DROP 3 } }
           { DUP 2 ;
             GET 5 ;
             SENDER ;
             MEM ;
             IF { DIG 5 ; DROP } { DIG 5 ; FAILWITH } ;
             DUP 2 ;
             GET 3 ;
             DUP 2 ;
             GET ;
             IF_NONE { PUSH string "No proposal exists for this counter" ; FAILWITH } {} ;
             DUP ;
             IF_LEFT
               { CAR ;
                 SENDER ;
                 MEM ;
                 NOT ;
                 IF { DIG 5 ; DROP } { DIG 5 ; FAILWITH } }
               { CAR ;
                 SENDER ;
                 MEM ;
                 NOT ;
                 IF { DIG 5 ; DROP } { DIG 5 ; FAILWITH } } ;
             DUP 3 ;
             GET 7 ;
             SENDER ;
             DIG 2 ;
             IF_LEFT
               { DUP ;
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
                 LEFT (pair (set address) address bool nat address unit mutez timestamp) }
               { DUP ;
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
                 RIGHT (pair (set address) address bool nat address unit mutez timestamp) } ;
             DUP ;
             IF_LEFT
               { DUP ;
                 GET 5 ;
                 IF { DIG 4 ;
                      DROP ;
                      NIL operation ;
                      DUP 2 ;
                      GET 9 ;
                      CONTRACT unit ;
                      IF_NONE { DIG 5 ; FAILWITH } { DIG 6 ; DROP } ;
                      DUP 3 ;
                      GET 13 ;
                      DIG 3 ;
                      GET 11 ;
                      TRANSFER_TOKENS ;
                      CONS }
                    { DIG 5 ; DROP 2 ; DIG 3 } }
               { DUP ;
                 GET 5 ;
                 IF { DIG 4 ;
                      DROP ;
                      NIL operation ;
                      DUP 2 ;
                      GET 9 ;
                      CONTRACT unit ;
                      IF_NONE { DIG 5 ; FAILWITH } { DIG 6 ; DROP } ;
                      DUP 3 ;
                      GET 13 ;
                      DIG 3 ;
                      GET 11 ;
                      TRANSFER_TOKENS ;
                      CONS }
                    { DIG 5 ; DROP 2 ; DIG 3 } } ;
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
