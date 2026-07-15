import { invocationSpecRank, specRank, type ArtsState } from "@/lib/arts";

export function resolveTechniqueSpecRanks({
  artKey,
  specIdx,
  secondaryArtKey,
  secondarySpecIdx,
  nature,
  invocationId,
  invocationRank,
  viewerArtsState,
  viewerRank,
  authorArtsState,
  authorRank,
}: {
  artKey: string | null;
  specIdx: number;
  secondaryArtKey: string | null;
  secondarySpecIdx: number;
  nature: string | null;
  invocationId: string | null;
  invocationRank?: string | null;
  viewerArtsState: ArtsState | null | undefined;
  viewerRank: string | null | undefined;
  authorArtsState: ArtsState | null | undefined;
  authorRank: string | null | undefined;
}) {
  const useViewer = nature === "COLLECTIVE";
  const state = useViewer ? viewerArtsState : authorArtsState;
  const rank = useViewer ? viewerRank : authorRank;
  const isKuchy = !!invocationId;
  const kuchyRank = invocationRank ?? rank ?? null;

  return {
    specRank: resolveOne(artKey, specIdx, state, rank, isKuchy, kuchyRank),
    secondarySpecRank: resolveOne(
      secondaryArtKey,
      secondarySpecIdx,
      state,
      rank,
      isKuchy,
      kuchyRank
    ),
  };
}

function resolveOne(
  artKey: string | null,
  specIdx: number,
  state: ArtsState | null | undefined,
  rank: string | null | undefined,
  isKuchy: boolean,
  kuchyRank: string | null
) {
  if (!artKey || specIdx < 0) return null;
  if (isKuchy) return kuchyRank == null ? null : invocationSpecRank(kuchyRank);
  if (rank == null) return null;
  return specRank(artKey, specIdx, state ?? null, rank);
}
