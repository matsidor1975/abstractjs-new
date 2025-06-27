import { isPermitSupported } from "../../../modules/utils/Helpers"
import type { BaseMeeClient } from "../../createMeeClient"
import { getPaymentToken } from "./getPaymentToken"
import signOnChainQuote, {
  type SignOnChainQuotePayload,
  type SignOnChainQuoteParams
} from "./signOnChainQuote"
import {
  type SignPermitQuoteParams,
  type SignPermitQuotePayload,
  signPermitQuote
} from "./signPermitQuote"

/**
 * Union type for parameters that can be used with signFusionQuote
 */
export type SignFusionQuoteParameters =
  | SignPermitQuoteParams
  | SignOnChainQuoteParams

/**
 * Union type for the payload returned by signFusionQuote
 */
export type SignFusionQuotePayload =
  | SignOnChainQuotePayload
  | SignPermitQuotePayload

/**
 * Signs a fusion quote by automatically selecting between permit and on-chain signing
 * based on the payment token's capabilities. If the token supports ERC20Permit,
 * it will use permit signing; otherwise, it will fall back to on-chain signing.
 *
 * @param client - The Mee client instance
 * @param parameters - Parameters for signing the fusion quote
 * @param parameters.fusionQuote - The fusion quote to sign
 * @param [parameters.account] - Optional account to use for signing
 *
 * @returns Promise resolving to the signed quote payload
 *
 * @example
 * ```typescript
 * const signedQuote = await signFusionQuote(meeClient, {
 *   fusionQuote: {
 *     quote: quotePayload,
 *     trigger: {
 *       tokenAddress: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // USDC
 *       chainId: 1,
 *       amount: "1000000" // 1 USDC
 *     }
 *   },
 *   account: smartAccount // Optional
 * });
 * ```
 *
 * @throws Will throw an error if:
 * - The quote format is invalid
 * - The signing process fails
 * - The token information cannot be retrieved
 */
export const signFusionQuote = async (
  client: BaseMeeClient,
  parameters: SignFusionQuoteParameters
): Promise<SignFusionQuotePayload> => {
  if ("call" in parameters.fusionQuote.trigger) {
    return signOnChainQuote(client, parameters)
  }

  const paymentTokenInfo = await getPaymentToken(
    client,
    parameters.fusionQuote.trigger
  )

  let permitEnabled = false

  if (paymentTokenInfo.paymentToken) {
    permitEnabled = paymentTokenInfo.paymentToken.permitEnabled || false
  } else if (paymentTokenInfo.isArbitraryPaymentTokensSupported) {
    const modularSmartAccount = client.account.deploymentOn(
      parameters.fusionQuote.trigger.chainId,
      true
    )

    permitEnabled = await isPermitSupported(
      modularSmartAccount.walletClient,
      parameters.fusionQuote.trigger.tokenAddress
    )
  } else {
    throw new Error(
      `Payment token (${parameters.fusionQuote.trigger.tokenAddress}) not supported for chain ${parameters.fusionQuote.trigger.chainId}`
    )
  }

  return permitEnabled
    ? signPermitQuote(client, parameters)
    : signOnChainQuote(client, parameters)
}

export default signFusionQuote
