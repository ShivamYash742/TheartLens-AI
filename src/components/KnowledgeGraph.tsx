"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import dynamic from "next/dynamic";
import type { Threat } from "@/types";

// Dynamically import to prevent SSR errors with Canvas
const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
  loading: () => (
    <div className="flex w-full h-full items-center justify-center bg-[var(--color-bg-primary)]">
      <div className="animate-pulse flex items-center gap-2">
        <div className="w-4 h-4 rounded-full bg-[var(--color-accent)]" />
        <span className="text-[var(--color-text-secondary)] font-mono text-sm">
          INITIALIZING_NEURAL_MAP
        </span>
      </div>
    </div>
  ),
});

interface GraphNode {
  id: string;
  group: string;
  label: string;
  val: number;
  x?: number;
  y?: number;
  fx?: number;
  fy?: number;
}

interface KnowledgeGraphProps {
  threats: Threat[];
}

export default function KnowledgeGraph({ threats }: KnowledgeGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // Handle precise sizing out of SSR bounds
  useEffect(() => {
    if (containerRef.current) {
      setDimensions({
        width: containerRef.current.offsetWidth,
        height: containerRef.current.offsetHeight,
      });
    }

    const handleResize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Process raw threats into graph nodes and links
  const graphData = useMemo(() => {
    const nodesMap = new Map();
    const links: { source: string; target: string; value: number }[] = [];

    // Helper to add nodes safely
    const addNode = (id: string, group: string, label: string, val: number) => {
      if (!nodesMap.has(id)) {
        nodesMap.set(id, { id, group, label, val });
      } else {
        nodesMap.get(id).val += val; // Increase size on more connections
      }
    };

    // Helper to add links
    const addLink = (source: string, target: string) => {
      const existing = links.find((l) => l.source === source && l.target === target);
      if (existing) {
        existing.value += 1;
      } else {
        links.push({ source, target, value: 1 });
      }
    };

    threats.forEach((t) => {
      const typeId = `type:${t.type}`;
      const systemId = `sys:${t.affected_system}`;
      const cveId = `cve:${t.cve}`;
      const docId = `doc:${t.document_id}`;

      // 1. Threat Type (Center nodes)
      addNode(typeId, "type", t.type, 2);
      
      // 2. Affected System
      if (t.affected_system && t.affected_system !== "Unknown") {
        addNode(systemId, "system", t.affected_system, 1.5);
        addLink(typeId, systemId);
      }

      // 3. CVE
      if (t.cve && t.cve !== "N/A") {
        addNode(cveId, "cve", t.cve, 1);
        addLink(typeId, cveId);
      }

      // 4. Document source
      if (t.document_id) {
        addNode(docId, "document", "Document Source", 1);
        addLink(docId, typeId);
      }
    });

    return {
      nodes: Array.from(nodesMap.values()),
      links,
    };
  }, [threats]);

  if (threats.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center text-[var(--color-text-muted)] p-6 text-center border border-[var(--color-border)] rounded-md">
        Upload documents to generate the threat intelligence graph.
      </div>
    );
  }

  // Define professional color palette mapping
  const getColor = (node: object) => {
    const n = node as GraphNode;
    switch (n.group) {
      case "type":
        return "#FF4500"; // Orange-Red for threat types
      case "system":
        return "#00FFFF"; // Cyan for affected systems
      case "cve":
        return "#FFD700"; // Gold for CVEs
      case "document":
        return "#808080"; // Muted Grey for documents
      default:
        return "#00FFFF";
    }
  };

  return (
    <div
      ref={containerRef}
      className="w-full h-full min-h-[400px] bg-[var(--color-bg-primary)] overflow-hidden"
    >
      {dimensions.width > 0 && (
        <ForceGraph2D
          width={dimensions.width}
          height={dimensions.height}
          graphData={graphData}
          nodeLabel="label"
          nodeColor={getColor}
          nodeRelSize={4}
          linkColor={() => "rgba(58, 58, 90, 0.6)"}
          linkWidth={(link) => Math.min(3, link.value)}
          linkDirectionalParticles={2}
          linkDirectionalParticleSpeed={0.005}
          linkDirectionalParticleColor={() => "#00FFFF"}
          backgroundColor="#0F0F1A"
          onNodeDragEnd={(node: object) => {
            const n = node as GraphNode;
            // Pin node on drag
            n.fx = n.x;
            n.fy = n.y;
          }}
          onNodeClick={(node: object) => {
            const n = node as GraphNode;
            // Unpin on click
            n.fx = undefined;
            n.fy = undefined;
          }}
          d3AlphaDecay={0.05}
          d3VelocityDecay={0.3}
        />
      )}
    </div>
  );
}
