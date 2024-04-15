# TzSafe

TzSafe is a website to interact with multi-signatures wallets. The goal is to have a UI layer above the LIGO contracts that you can find [here](https://github.com/marigold-dev/tzsafe).

- Documentation can be found [here](https://docs.tzsafe.marigold.dev/).
- Ghostnet version of this frontend UI can be found on [ghostnet.tzsafe.marigold.dev](https://ghostnet.tzsafe.marigold.dev/).
- Mainnet version of this frontend UI can be found on [tzsafe.marigold.dev](https://tzsafe.marigold.dev/).

## How to develop ?

First, clone the repository:

```bash
git clone https://github.com/marigold-dev/tzsafe-ui/
```

Then install the dependencies:

```bash
npm i
```

Finally you can develop with:

```bash
npm run dev
```

### How to run

There are two ways to run TzSafe, with or without docker.

#### Docker

```bash
docker build -t tzsafe .
docker run -p 8080:80 tzsafe
```

When building the application you can specify which node and which network you want to use:

```bash
docker build --build-arg="PUBLIC_RPC_URL=https://mainnet.tezos.marigold.dev" -t tzsafe .
```

You can override:

- PUBLIC_RPC_URL: the URL of the node you want to use (default: https://rpc.tzkt.io/mainnet/)
- PUBLIC_API_URL: the URL of a tzkt instance (default: https://api.tzkt.io)
- PUBLIC_NETWORK_TYPE: the type of the network (default: mainnet)

### With NPM

```
npm i
npm run start:mainnet
```

You can override the variable by editing the file `/config/.env.mainnet`

## Sandbox

Sandbox enables us to locally run Tezos-node and Tzkt. There are two modes: stateful and stateless. In stateful mode, the data of Tezos-node and the database of Tzkt are preserved when docker compose stops, while in stateless mode, both start from the genesis block.

```bash

# To start stateless node
docker-compose -f docker-compose.stateless.yml up --abort-on-container-exit

# To start stateful node
docker-compose -f docker-compose.stateful.yml up --abort-on-container-exit
```
