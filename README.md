# TODO

<!-- - Stocker les dapps connecter dans le state global -->
<!-- - Ajouter une catégorie dans les settings pour déconnecter les dapps -->

- Modal PoE
- Incoming request -> request modal

# TzSafe

TzSafe is a website to interact with multi-signatures wallets. The goal is to have a UI layer above the LIGO contracts that you can find [here](https://github.com/marigold-dev/tzsafe).

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

### How to build the code

Once you updated the code, you can build it with:

```bash
npm run build
```

And serve the build with:

```bash
npm start
```

## Sandbox

Sandbox enables us to locally run Tezos-node and Tzkt. There are two modes: stateful and stateless. In stateful mode, the data of Tezos-node and the database of Tzkt are preserved when docker compose stops, while in stateless mode, both start from the genesis block.

```bash

# To start stateless node
docker-compose -f docker-compose.stateless.yml up --abort-on-container-exit

# To start stateful node
docker-compose -f docker-compose.stateful.yml up --abort-on-container-exit
```
