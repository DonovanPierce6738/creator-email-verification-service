export type CreatorAccess = {
  digitalAssetDelivery: "held" | "ready";
  subscriberUpdates: "held" | "ready";
  contentProcessing: "held" | "ready";
};

export function accessForEmailVerification(verified: boolean): CreatorAccess {
  const state = verified ? "ready" : "held";
  return {
    digitalAssetDelivery: state,
    subscriberUpdates: state,
    contentProcessing: state,
  };
}
