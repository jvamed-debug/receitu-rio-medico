export function FeatureList({ items }: { items: string[] }) {
  return (
    <div style={{ display: "grid", gap: 12 }}>
      {items.map((item) => (
        <div
          key={item}
          style={{
            padding: "14px 16px",
            borderRadius: 14,
            background: "#f7fbff",
            border: "1px solid #d7e6f6"
          }}
        >
          {item}
        </div>
      ))}
    </div>
  );
}
