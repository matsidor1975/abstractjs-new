import type { MetaMaskSmartAccount } from "@metamask/delegation-toolkit"
import { isPermitSupported } from "../../../modules/utils/Helpers"
import type { BaseMeeClient } from "../../createMeeClient"
import getMmDtkQuote, { type GetMmDtkQuoteParams } from "./getMmDtkQuote"
import getOnChainQuote, { type GetOnChainQuotePayload } from "./getOnChainQuote"
import { getPaymentToken } from "./getPaymentToken"
import getPermitQuote, { type GetPermitQuotePayload } from "./getPermitQuote"
import type { CleanUp, GetQuoteParams } from "./getQuote"
import type { Trigger } from "./signPermitQuote"

/**
 * Union type representing the possible quote payloads returned by getFusionQuote
 * @see {@link GetPermitQuotePayload} - Payload when permit is enabled
 * @see {@link GetOnChainQuotePayload} - Payload when using standard on-chain transactions
 */
export type GetFusionQuotePayload =
  | GetPermitQuotePayload
  | GetOnChainQuotePayload

/**
 * Parameters for getting a fusion quote
 */
export type GetFusionQuoteParams = GetQuoteParams & {
  /**
   * Trigger information for the transaction
   * Contains details about the payment token and chain
   * @see {@link Trigger}
   */
  trigger: Trigger
  /**
   * token cleanup option to pull the funds on failure or dust cleanup
   */
  cleanUps?: CleanUp[]
  /**
   * Optional delegator smart account
   * If not provided, that means the Delegation Toolkit fusion
   * mode won't be used
   */
  delegatorSmartAccount?: MetaMaskSmartAccount
}

/**
 * Gets a quote using either permit or standard on-chain transaction based on token capabilities.
 * This function automatically determines whether to use permit-based or standard transactions
 * by checking the payment token's permit support.
 *
 * @param client - The Mee client instance used for API interactions
 * @param parameters - Parameters for generating the quote
 * @param parameters.trigger - Transaction trigger information
 * @param parameters.instructions - Array of transaction instructions to be executed
 * @param parameters.chainId - Target blockchain chain ID
 * @param parameters.walletProvider - Wallet provider to use
 * @param [parameters.gasToken] - Optional token address to use for gas payment
 * @param [parameters.fusionMode] - Optional explicitly set fusion mode
 *
 * @returns Promise resolving to either a permit quote or on-chain quote payload
 *
 * @example
 * ```typescript
 * const quote = await getFusionQuote(client, {
 *   chainId: "1",
 *   walletProvider: "metamask",
 *   trigger: {
 *     chainId: "1",
 *     paymentToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" // USDC
 *   },
 *   instructions: [{
 *     to: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
 *     data: "0x...",
 *     value: "0"
 *   }]
 * });
 * // Returns either GetPermitQuotePayload or GetOnChainQuotePayload
 * // depending on USDC's permit support
 * ```
 *
 * @throws Will throw an error if:
 * - The payment token information cannot be retrieved
 * - The quote generation fails
 * - The API request fails
 */
export const getFusionQuote = async (
  client: BaseMeeClient,
  parameters: GetFusionQuoteParams
): Promise<GetFusionQuotePayload> => {
  // if delegator smart account is provided, we use mm-dtk fusion mode
  if (parameters.delegatorSmartAccount) {
    return getMmDtkQuote(client, parameters as GetMmDtkQuoteParams)
  }

  // if custom call is provided, we use on-chain tx fusion mode
  if ("call" in parameters.trigger) {
    return getOnChainQuote(client, parameters)
  }

  const paymentTokenInfo = await getPaymentToken(client, parameters.trigger)
  let permitEnabled = false

  if (paymentTokenInfo.paymentToken) {
    permitEnabled = paymentTokenInfo.paymentToken.permitEnabled || false
  } else if (paymentTokenInfo.isArbitraryPaymentTokensSupported) {
    const modularSmartAccount = client.account.deploymentOn(
      parameters.trigger.chainId,
      true
    )

    permitEnabled = await isPermitSupported(
      modularSmartAccount.walletClient,
      parameters.trigger.tokenAddress
    )
  } else {
    throw new Error(
      `Payment token (${parameters.trigger.tokenAddress}) not supported for chain ${parameters.trigger.chainId}`
    )
  }

  return permitEnabled
    ? getPermitQuote(client, parameters)
    : getOnChainQuote(client, parameters)
}

export default getFusionQuote
