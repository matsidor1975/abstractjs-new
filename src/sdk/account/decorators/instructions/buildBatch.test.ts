import type { Address, Chain, LocalAccount, Transport } from "viem"
import { beforeAll, describe, expect, it } from "vitest"
import { getTestChainConfig, toNetwork } from "../../../../test/testSetup"
import type { NetworkConfig } from "../../../../test/testUtils"
import {
  type MeeClient,
  createMeeClient
} from "../../../clients/createMeeClient"
import type { Instruction } from "../../../clients/decorators/mee/getQuote"
import { mcUSDC } from "../../../constants/tokens"
import {
  type MultichainSmartAccount,
  toMultichainNexusAccount
} from "../../toMultiChainNexusAccount"
import buildApprove from "./buildApprove"
import buildBatch from "./buildBatch"
import buildWithdrawal from "./buildWithdrawal"

describe("mee.buildBatch", () => {
  let network: NetworkConfig
  let eoaAccount: LocalAccount

  let mcNexus: MultichainSmartAccount
  let meeClient: MeeClient

  let tokenAddress: Address
  let paymentChain: Chain
  let targetChain: Chain
  let paymentChainTransport: Transport
  let targetChainTransport: Transport

  beforeAll(async () => {
    network = await toNetwork("MAINNET_FROM_ENV_VARS")
    ;[
      [paymentChain, targetChain],
      [paymentChainTransport, targetChainTransport]
    ] = getTestChainConfig(network)

    eoaAccount = network.account!

    mcNexus = await toMultichainNexusAccount({
      chains: [paymentChain, targetChain],
      transports: [paymentChainTransport, targetChainTransport],
      signer: eoaAccount
    })

    meeClient = await createMeeClient({ account: mcNexus })
    tokenAddress = mcUSDC.addressOn(paymentChain.id)
  })

  it("should build a batch instruction", async () => {
    const instructions: Instruction[] = await buildBatch(
      { account: mcNexus, currentInstructions: [] },
      {
        instructions: [
          buildApprove(
            { account: mcNexus, currentInstructions: [] },
            {
              chainId: targetChain.id,
              tokenAddress,
              amount: 100n,
              spender: mcNexus.addressOn(targetChain.id, true)
            }
          ),
          buildWithdrawal(
            { account: mcNexus, currentInstructions: [] },
            {
              chainId: targetChain.id,
              tokenAddress,
              amount: 1n
            }
          )
        ]
      }
    )

    expect(instructions[0].calls.length).toBe(2)
  })
})
