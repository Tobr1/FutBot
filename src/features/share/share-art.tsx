import type { ReactNode } from "react";
import { AppIconArt } from "@/components/brand/app-icon-art";
import type { RatingTier } from "@/domain/players/rating";
import { BRAND } from "@/lib/brand";

/*
 * Arte de las imágenes para compartir (ImageResponse / Satori): solo estilos
 * inline y flexbox, colores en hex (los mismos tokens que la app, ver
 * lib/brand.ts) y la fuente por defecto de next/og. Sin emojis ni imágenes
 * remotas: el render no depende de la red.
 */

export const SHARE_SIZE = { width: 1080, height: 1350 } as const;

const C = {
  bg: BRAND.bg,
  surface: "#0b1320",
  fg: "#e9eff7",
  muted: "#939fb1",
  hairline: "rgba(233, 239, 247, 0.12)",
  teamA: BRAND.blue,
  teamB: "#ff666f",
  gold: "#eec55e",
  win: "#3dd383",
  draw: "#9da5b1",
  loss: "#ff666f",
} as const;

const TIER_COLORS: Record<RatingTier, { text: string; card: string }> = {
  promesa: { text: "#f1c4a0", card: "#6c4128" },
  titular: { text: "#e0e5eb", card: "#5b646f" },
  figura: { text: C.gold, card: "#a77f19" },
  crack: { text: "#88d6ff", card: "#3665e4" },
};

const ellipsis = {
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
} as const;

function Frame({ children, glow }: { children: ReactNode; glow: string }) {
  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        padding: "72px 72px 56px",
        color: C.fg,
        backgroundColor: C.bg,
        backgroundImage: `radial-gradient(circle at 50% 0%, ${glow} 0%, rgba(5, 10, 21, 0) 60%)`,
      }}
    >
      {/* Línea media y círculo central de la cancha, muy sutiles. */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: SHARE_SIZE.height / 2,
          width: SHARE_SIZE.width,
          height: 2,
          backgroundColor: "rgba(255,255,255,0.04)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: (SHARE_SIZE.width - 420) / 2,
          top: (SHARE_SIZE.height - 420) / 2,
          width: 420,
          height: 420,
          borderRadius: 420,
          border: "2px solid rgba(255,255,255,0.04)",
        }}
      />
      {children}
    </div>
  );
}

function Header({ groupName, subtitle }: { groupName: string; subtitle: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div
        style={{
          display: "flex",
          fontSize: 30,
          letterSpacing: 6,
          color: C.muted,
          textTransform: "uppercase",
        }}
      >
        {subtitle}
      </div>
      <div
        style={{
          display: "flex",
          marginTop: 12,
          fontSize: 64,
          fontWeight: 700,
          lineHeight: 1.05,
          maxWidth: 936,
          ...ellipsis,
        }}
      >
        {groupName}
      </div>
    </div>
  );
}

function Footer() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        marginTop: "auto",
        paddingTop: 32,
        borderTop: `2px solid ${C.hairline}`,
      }}
    >
      <AppIconArt size={64} variant="any" />
      <div
        style={{
          display: "flex",
          marginLeft: 20,
          fontSize: 40,
          letterSpacing: 4,
        }}
      >
        <span>FUTBOL</span>
        <span style={{ marginLeft: -2, color: BRAND.blue }}>EROS</span>
      </div>
    </div>
  );
}

function StarSvg({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z" />
    </svg>
  );
}

export interface MatchShareArt {
  groupName: string;
  /** "Sábado 25/10 · El Potrero". */
  subtitle: string;
  teams: {
    a: { name: string; score: number; scorers: string[] };
    b: { name: string; score: number; scorers: string[] };
  };
  mvp: string | null;
}

/** Resultado de un partido: equipos con sus colores, marcador, goleadores y MVP. */
export function MatchShareImage({ data }: { data: MatchShareArt }) {
  const side = (key: "a" | "b") => {
    const team = data.teams[key];
    const color = key === "a" ? C.teamA : C.teamB;
    const shown = team.scorers.slice(0, 6);
    const rest = team.scorers.length - shown.length;
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: key === "a" ? "flex-start" : "flex-end",
          width: 440,
        }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          {key === "a" && (
            <div
              style={{
                width: 22,
                height: 22,
                borderRadius: 22,
                backgroundColor: color,
                marginRight: 16,
              }}
            />
          )}
          <div
            style={{
              display: "flex",
              fontSize: 48,
              fontWeight: 700,
              color,
              maxWidth: 380,
              ...ellipsis,
            }}
          >
            {team.name}
          </div>
          {key === "b" && (
            <div
              style={{
                width: 22,
                height: 22,
                borderRadius: 22,
                backgroundColor: color,
                marginLeft: 16,
              }}
            />
          )}
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 260,
            fontWeight: 700,
            lineHeight: 1,
            marginTop: 8,
          }}
        >
          {team.score}
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: key === "a" ? "flex-start" : "flex-end",
            marginTop: 24,
          }}
        >
          {shown.map((s, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                fontSize: 34,
                color: C.fg,
                lineHeight: 1.45,
                maxWidth: 440,
                ...ellipsis,
              }}
            >
              {s}
            </div>
          ))}
          {rest > 0 && <div style={{ display: "flex", fontSize: 30, color: C.muted }}>{`+${rest} más`}</div>}
          {team.scorers.length === 0 && <div style={{ display: "flex", fontSize: 32, color: C.muted }}>Sin goles</div>}
        </div>
      </div>
    );
  };

  return (
    <Frame glow="rgba(52, 145, 255, 0.34)">
      <Header groupName={data.groupName} subtitle={data.subtitle} />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          justifyContent: "center",
          paddingBottom: 24,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
          }}
        >
          {side("a")}
          <div
            style={{
              display: "flex",
              fontSize: 140,
              color: C.muted,
              marginTop: 120,
            }}
          >
            –
          </div>
          {side("b")}
        </div>
        {data.mvp && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              alignSelf: "center",
              marginTop: 64,
              padding: "20px 36px",
              borderRadius: 999,
              border: `3px solid ${C.gold}`,
              backgroundColor: "rgba(238, 197, 94, 0.12)",
            }}
          >
            <StarSvg size={48} color={C.gold} />
            <div
              style={{
                display: "flex",
                marginLeft: 16,
                fontSize: 34,
                letterSpacing: 4,
                color: C.gold,
              }}
            >
              MVP
            </div>
            <div
              style={{
                display: "flex",
                marginLeft: 20,
                fontSize: 44,
                fontWeight: 700,
                maxWidth: 560,
                ...ellipsis,
              }}
            >
              {data.mvp}
            </div>
          </div>
        )}
      </div>
      <Footer />
    </Frame>
  );
}

export interface PlayerShareArt {
  groupName: string;
  nickname: string;
  overall: number;
  tier: RatingTier;
  tierLabel: string;
  position: string | null;
  isProvisional: boolean;
  stats: Array<{ label: string; value: string }>;
  record: { wins: number; draws: number; losses: number };
  awards: { total: number; titles: string[] };
}

/** Ficha del jugador: valoración con el color de su tier, estadísticas, récord y logros. */
export function PlayerShareImage({ data }: { data: PlayerShareArt }) {
  const tier = TIER_COLORS[data.tier];
  const total = data.record.wins + data.record.draws + data.record.losses;
  const segments = [
    { key: "w", value: data.record.wins, color: C.win, label: "PG" },
    { key: "d", value: data.record.draws, color: C.draw, label: "PE" },
    { key: "l", value: data.record.losses, color: C.loss, label: "PP" },
  ];

  return (
    <Frame glow={`${tier.card}88`}>
      <Header groupName={data.groupName} subtitle="Ficha del jugador" />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          justifyContent: "center",
          paddingBottom: 24,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: 48,
            borderRadius: 40,
            border: `2px solid ${C.hairline}`,
            backgroundImage: `linear-gradient(160deg, ${tier.card} 0%, ${C.surface} 70%)`,
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              width: 300,
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: 200,
                fontWeight: 700,
                lineHeight: 1,
                color: tier.text,
              }}
            >
              {data.overall}
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 34,
                letterSpacing: 6,
                color: tier.text,
                textTransform: "uppercase",
              }}
            >
              {data.tierLabel}
            </div>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              marginLeft: 40,
              flex: 1,
              minWidth: 0,
            }}
          >
            {data.position && (
              <div
                style={{
                  display: "flex",
                  fontSize: 32,
                  letterSpacing: 4,
                  color: C.muted,
                }}
              >
                {data.position}
              </div>
            )}
            <div
              style={{
                display: "flex",
                fontSize: data.nickname.length > 9 ? 64 : 88,
                fontWeight: 700,
                lineHeight: 1.05,
                textTransform: "uppercase",
                maxWidth: 520,
                wordBreak: "break-word",
              }}
            >
              {data.nickname}
            </div>
            {data.isProvisional && (
              <div
                style={{
                  display: "flex",
                  marginTop: 12,
                  fontSize: 28,
                  color: C.muted,
                }}
              >
                Valoración provisional
              </div>
            )}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            marginTop: 40,
            borderRadius: 28,
            border: `2px solid ${C.hairline}`,
            backgroundColor: C.surface,
          }}
        >
          {data.stats.map((s, i) => (
            <div
              key={s.label}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                flex: 1,
                padding: "28px 0",
                borderLeft: i === 0 ? "none" : `2px solid ${C.hairline}`,
              }}
            >
              <div
                style={{
                  display: "flex",
                  fontSize: 64,
                  fontWeight: 700,
                  lineHeight: 1,
                }}
              >
                {s.value}
              </div>
              <div
                style={{
                  display: "flex",
                  marginTop: 10,
                  fontSize: 26,
                  letterSpacing: 3,
                  color: C.muted,
                }}
              >
                {s.label}
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", marginTop: 36 }}>
          <div
            style={{
              display: "flex",
              height: 20,
              borderRadius: 20,
              overflow: "hidden",
              backgroundColor: C.surface,
            }}
          >
            {total > 0 &&
              segments.map((s) =>
                s.value > 0 ? (
                  <div
                    key={s.key}
                    style={{
                      display: "flex",
                      width: `${(s.value / total) * 100}%`,
                      height: 20,
                      backgroundColor: s.color,
                    }}
                  />
                ) : null,
              )}
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 16,
              fontSize: 30,
              color: C.muted,
            }}
          >
            {segments.map((s) => (
              <div
                key={s.key}
                style={{
                  display: "flex",
                  alignItems: "center",
                  marginRight: 36,
                }}
              >
                <div
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: 16,
                    backgroundColor: s.color,
                    marginRight: 10,
                  }}
                />
                {`${s.value} ${s.label}`}
              </div>
            ))}
          </div>
        </div>

        {data.awards.total > 0 && (
          <div style={{ display: "flex", alignItems: "center", marginTop: 40 }}>
            <StarSvg size={44} color={C.gold} />
            <div
              style={{
                display: "flex",
                marginLeft: 16,
                fontSize: 36,
                color: C.gold,
              }}
            >
              {`${data.awards.total} ${data.awards.total === 1 ? "logro" : "logros"}`}
            </div>
            {data.awards.titles.length > 0 && (
              <div
                style={{
                  display: "flex",
                  marginLeft: 20,
                  fontSize: 32,
                  color: C.muted,
                  maxWidth: 640,
                  ...ellipsis,
                }}
              >
                {data.awards.titles.join(" · ")}
              </div>
            )}
          </div>
        )}
      </div>
      <Footer />
    </Frame>
  );
}
