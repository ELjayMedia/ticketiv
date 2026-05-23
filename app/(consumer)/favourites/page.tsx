import { AccountEmptyPage } from "@/components/quiet/screens/account/account-empty-page";

export const metadata = { title: "Favourites" };
export const dynamic = "force-dynamic";

export default function FavouritesPage() {
  return (
    <AccountEmptyPage
      eyebrow="Saved events"
      title="Favourites"
      description="Events you save from discovery and event detail will live here, so you can come back before tickets sell out."
      icon="heart"
      primaryHref="/"
      primaryLabel="Find events"
      secondaryHref="/me"
      secondaryLabel="Account"
      bullets={[
        "Saved events from discovery",
        "Followed series and organisers",
        "Upcoming events you may want to buy later",
      ]}
    />
  );
}
