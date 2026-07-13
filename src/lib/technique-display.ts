import { invocationSpecRank, specRank, type ArtsState } from "@/lib/arts";

export function resolveTechniqueSpecRanks({
  artKey,
  specIdx,
  secondaryArtKey,
  secondarySpecIdx,
  nature,
  invocationId,
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
  viewerArtsState: ArtsState | null | undefined;
  viewerRank: string | null | undefined;
  authorArtsState: ArtsState | null | undefined;
  authorRank: string | null | undefined;
}) {
  const useViewer = nature === "COLLECTIVE";
  const state = useViewer ? viewerArtsState : authorArtsState;
  const rank = useViewer ? viewerRank : authorRank;
  const isKuchy = !!invocationId;

  return {
    specRank: resolveOne(artKey, specIdx, state, rank, isKuchy),
    secondarySpecRank: resolveOne(secondaryArtKey, secondarySpecIdx, state, rank, isKuchy),
  };
}

function resolveOne(
  artKey: string | null,
  specIdx: number,
  state: ArtsState | null | undefined,
  rank: string | null | undefined,
  isKuchy: boolean
) {
  if (!artKey || specIdx < 0 || rank == null) return null;
  if (isKuchy) return invocationSpecRank(rank);
  return specRank(artKey, specIdx, state ?? null, rank);
}
