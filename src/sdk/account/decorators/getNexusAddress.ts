import { type Address, pad, toHex } from "viem"
import type { PublicClient } from "viem"
import { AccountFactoryAbi } from "../../constants/abi/AccountFactory"

/**
 * Parameters for getting the MEE counterfactual address
 * @property publicClient - {@link PublicClient} The public client to use for the read contract
 * @property signerAddress - {@link Address} The address of the EOA signer
 * @property index - Optional BigInt index for deterministic deployment (defaults to 0)
 */
export type GetUniversalAddressParams<
  ExtendedPublicClient extends PublicClient
> = {
  factoryAddress: Address
  publicClient: ExtendedPublicClient
  initData: Address
  index: bigint
}

/**
 * Gets the counterfactual address for a MEE Nexus account
 *
 * @param params - {@link GetUniversalAddressParams} Configuration for address computation
 * @param params.publicClient - The public client to use for the read contract
 * @param params.signerAddress - The address of the EOA signer
 * @param params.index - Optional account index (defaults to 0)
 *
 * @returns Promise resolving to the {@link Address} of the counterfactual account
 *
 * @example
 * const accountAddress = await getNexusAddress({
 *   publicClient: viemPublicClient,
 *   initData: "0x123...",
 *   index: BigInt(0)
 * });
 */
export const getNexusAddress = async (
  params: GetUniversalAddressParams<PublicClient>
): Promise<Address> => {
  const { publicClient, initData, factoryAddress, index = 0n } = params

  const salt = pad(toHex(index), { size: 32 })

  return await publicClient.readContract({
    address: factoryAddress,
    abi: AccountFactoryAbi,
    functionName: "computeAccountAddress",
    args: [initData, salt]
  })
}

/**
 * Parameters for getting the counterfactual address via K1 Factory
 * @property publicClient - {@link PublicClient} The public client to use for the read contract
 * @property ownerAddress - {@link Address} The address of the EOA signer
 * @property attesters - {@link Address[]} The addresses of the attesters
 * @property attesterThreshold - {@link number} The threshold for the attesters
 * @property index - Optional BigInt index for deterministic deployment (defaults to 0)
 */
export type GetK1NexusAddressParams<ExtendedPublicClient extends PublicClient> =
  {
    factoryAddress: Address
    publicClient: ExtendedPublicClient
    ownerAddress: Address
    attesters: Address[]
    attesterThreshold: number
    index: bigint
  }
