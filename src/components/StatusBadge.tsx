type Props = {
  published: boolean;
  label?: string;
};

export function StatusBadge({ published, label }: Props) {
  return (
    <span className={`badge ${published ? "" : "off"}`}>
      {label ?? (published ? "Published" : "Draft")}
    </span>
  );
}
