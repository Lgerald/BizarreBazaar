export default function NotFoundYet() {
  const CROP_TOP_PX = 130;
  const CROP_BOTTOM_PX = 400;
  const CROP_SIDES_PX = 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", width: "100%", minHeight: 0 }}>
      <h1 style={{ margin: 0, padding: 16, alignSelf: "center" }}>
        Bizzarre, looks like theres nothing here yet 🤔
      </h1>
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflow: "hidden",
        }}
      >
        <iframe
          src="https://chromedino.com/batman/"
          loading="lazy"
          title="Not found yet"
          style={{
            width: "100%",
            height: "100%",
            border: 0,
            display: "block",
            clipPath: `inset(${CROP_TOP_PX}px ${CROP_SIDES_PX}px ${CROP_BOTTOM_PX}px ${CROP_SIDES_PX}px)`,
          }}
        />
      </div>
    </div>
  );
}