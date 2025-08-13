import { http, type Prettify, type Transport } from "viem"
import {
  type Chain,
  base,
  baseSepolia,
  chiliz,
  mainnet,
  optimism,
  optimismSepolia
} from "viem/chains"
import { test } from "vitest"
import {
  BASE_SEPOLIA_RPC_URL,
  type NetworkConfig,
  initEcosystem,
  initNetwork
} from "./testUtils"

export const TEST_BLOCK_CONFIRMATIONS = 5

export const MAINNET_RPC_URLS: Record<number, string> = {
  [mainnet.id]: `https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
  [optimism.id]: `https://opt-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
  [base.id]: `https://base-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
  [chiliz.id]: "https://rpc.ankr.com/chiliz" // Public RPC
}

export const TESTNET_RPC_URLS: Record<number, string> = {
  [optimismSepolia.id]: `https://opt-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
  [baseSepolia.id]: `https://base-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
}

export const testnetTest = test.extend<{
  config: NetworkConfig
}>({
  // biome-ignore lint/correctness/noEmptyPattern: Needed in vitest :/
  config: async ({}, use) => {
    const testNetwork = await toNetwork("TESTNET_FROM_ENV_VARS")
    await use(testNetwork)
  }
})

export type TestFileNetworkType =
  | "BESPOKE_ANVIL_NETWORK"
  | "BESPOKE_ANVIL_NETWORK_FORKING_BASE_SEPOLIA"
  | "TESTNET_FROM_ENV_VARS"
  | "MAINNET_FROM_ENV_VARS"
  | "COMMUNAL_ANVIL_NETWORK"

type PrettifiedNetworkConfig = Prettify<NetworkConfig>
export const toNetwork = async (
  networkType: TestFileNetworkType = "BESPOKE_ANVIL_NETWORK"
): Promise<PrettifiedNetworkConfig> => {
  switch (networkType) {
    case "BESPOKE_ANVIL_NETWORK": {
      return await initEcosystem()
    }
    case "COMMUNAL_ANVIL_NETWORK": {
      return await initEcosystem()
    }
    case "BESPOKE_ANVIL_NETWORK_FORKING_BASE_SEPOLIA": {
      return await initEcosystem({ forkUrl: BASE_SEPOLIA_RPC_URL })
    }
    case "TESTNET_FROM_ENV_VARS": {
      return await initNetwork(networkType)
    }
    case "MAINNET_FROM_ENV_VARS": {
      return await initNetwork(networkType)
    }
  }
}

export const paymasterTruthy = () => {
  try {
    return !!process.env.PAYMASTER_URL
  } catch (e) {
    return false
  }
}

/**
 * Sorts the chains for testing, throwing an error if the chain is not supported
 * @param network - The network configuration
 * @returns The sorted chains of the order: [optimism, base]
 * @throws {Error} If the chain is not supported
 */
export const getTestChainConfig = (
  network: NetworkConfig
): [Chain[], Transport[]] => {
  const defaultChainsIncludePaymentChain = Object.keys(MAINNET_RPC_URLS).some(
    (id) => Number(id) === network.chain.id
  )
  if (defaultChainsIncludePaymentChain) {
    const chainMap: Record<number, Chain> = {
      [optimism.id]: optimism,
      [base.id]: base
    }
    const pairedChains = Object.entries(MAINNET_RPC_URLS)
      .map(([id, url]) => ({
        chain: chainMap[Number(id)],
        transport: http(url)
      }))
      .filter(({ chain }) => chain !== undefined)
    const sortedPairedChains = pairedChains.sort((a, b) =>
      a.chain.id === network.chain.id ? -1 : 1
    )
    const sortedChains = sortedPairedChains.map(({ chain }) => chain)
    const sortedTransports = sortedPairedChains.map(
      ({ transport }) => transport
    )

    return [sortedChains, sortedTransports]
  }
  throw new Error("Unsupported chain")
}

export type { NetworkConfig }
