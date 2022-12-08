type content = { execute: { amount: number, to: string, parameter: {} } } | { transfer: { amount: number, to: string, parameter: {} } }
type proposal = {
    approved_signers: string[],
    content: content[],
    executed: boolean
    number_of_signer: number
    proposer: string
    timestamp: string
}
export {type content, type proposal}
