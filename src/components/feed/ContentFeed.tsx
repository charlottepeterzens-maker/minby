import { FeedItemRenderer } from "./FeedItemRenderer";

type Props = {
  items: any[];
};

export const ContentFeed = ({ items }: Props) => {
  return (
    <>
      {items.map((item) => (
        <FeedItemRenderer key={item.data.id} item={item} />
      ))}
    </>
  );
};
