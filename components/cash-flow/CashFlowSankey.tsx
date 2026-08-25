"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ResponsiveContainer,
  Sankey,
  type SankeyLinkProps,
  type SankeyNodeProps,
} from "recharts";
import type { CashFlowLink, CashFlowNode } from "@/lib/cash-flow";

interface CashFlowSankeyProps {
  nodes: CashFlowNode[];
  links: CashFlowLink[];
  totalIncome: number;
}

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function makeNodeRenderer(
  totalIncome: number,
  onNavigate: (href: string) => void,
) {
  return function CashFlowNodeShape(props: SankeyNodeProps) {
    const { x, y, width, height, payload } = props;
    const node = payload as unknown as CashFlowNode;
    const percent = (payload.value / totalIncome) * 100;
    const clickable = Boolean(node.href);

    return (
      <g
        onClick={clickable ? () => onNavigate(node.href!) : undefined}
        style={clickable ? { cursor: "pointer" } : undefined}
      >
        <rect x={x} y={y} width={width} height={height} rx={2} fill={node.color} />
        <text
          x={x + width + 8}
          y={y + height / 2 - 4}
          fontFamily="var(--font-sans)"
          fontSize={12}
          fill="var(--color-ink-900)"
          textDecoration={clickable ? "underline" : undefined}
        >
          {payload.name}
        </text>
        <text
          x={x + width + 8}
          y={y + height / 2 + 12}
          fontFamily="var(--font-mono)"
          fontSize={11}
          fill="var(--color-linen-700)"
        >
          {`${currency.format(payload.value)} (${percent.toFixed(2)}%)`}
        </text>
      </g>
    );
  };
}

function CashFlowLinkShape(props: SankeyLinkProps) {
  const {
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourceControlX,
    targetControlX,
    linkWidth,
    payload,
  } = props;
  const color = (payload.source as unknown as CashFlowNode).color;

  return (
    <path
      d={`M${sourceX},${sourceY} C${sourceControlX},${sourceY} ${targetControlX},${targetY} ${targetX},${targetY}`}
      fill="none"
      stroke={color}
      strokeOpacity={0.25}
      strokeWidth={Math.max(linkWidth, 1)}
    />
  );
}

export function CashFlowSankey({ nodes, links, totalIncome }: CashFlowSankeyProps) {
  const router = useRouter();
  const [bloomed, setBloomed] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setBloomed(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const height = Math.max(640, nodes.length * 34);

  return (
    <div className="overflow-x-auto">
      <div
        className={`chart-bloom min-w-[900px] ${bloomed ? "is-bloomed" : ""}`}
        style={{ height }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <Sankey
            data={{ nodes, links }}
            nodeWidth={14}
            nodePadding={30}
            margin={{ top: 8, right: 160, bottom: 8, left: 8 }}
            link={CashFlowLinkShape}
            node={makeNodeRenderer(totalIncome, (href) => router.push(href))}
          />
        </ResponsiveContainer>
      </div>
    </div>
  );
}
