import React, { useState, useCallback, useMemo } from "react";
import ReactFlow, {
  Background,
  Controls,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
} from "reactflow";
import "reactflow/dist/style.css";

/**
 * Different data shape:
 * node.data = {
 *   title: string,
 *   category: "Start" | "Task" | "Approval" | "Automated" | "End",
 *   config: { ...dynamic fields }
 * }
 */

function App() {
  const [workflowNodes, setWorkflowNodes] = useState([
    {
      id: "n1",
      position: { x: 120, y: 120 },
      data: {
        title: "Start",
        category: "Start",
        config: {},
      },
    },
    {
      id: "n2",
      position: { x: 420, y: 220 },
      data: {
        title: "Task",
        category: "Task",
        config: { description: "", assignee: "" },
      },
    },
  ]);

  const [connections, setConnections] = useState([]);
  const [activeNode, setActiveNode] = useState(null);
  const [activeEdge, setActiveEdge] = useState(null);
  const [logs, setLogs] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // --- React Flow change handlers
  const onNodesChange = useCallback(
    (changes) =>
      setWorkflowNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );

  const onEdgesChange = useCallback(
    (changes) =>
      setConnections((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  const onConnect = useCallback(
    (params) => setConnections((eds) => addEdge(params, eds)),
    []
  );

  // --- Toolbar: create nodes
  const createNode = (category) => {
    const id = `n${workflowNodes.length + 1}`;
    const base = {
      id,
      position: {
        x: 80 + Math.random() * 500,
        y: 80 + Math.random() * 400,
      },
      data: {
        title: `${category}`,
        category,
        config: {},
      },
    };

    if (category === "Task") {
      base.data.config = { description: "", assignee: "" };
    }
    if (category === "Approval") {
      base.data.config = { role: "", threshold: "" };
    }

    setWorkflowNodes((nds) => [...nds, base]);
  };

  // --- Selection
  const onNodeClick = (_, node) => {
    setActiveNode(node);
    setActiveEdge(null);
    setIsModalOpen(true);
  };

  const onEdgeClick = (_, edge) => {
    setActiveEdge(edge);
    setActiveNode(null);
  };

  // --- Update node (modal form)
  const updateNode = (field, value) => {
    setWorkflowNodes((nds) =>
      nds.map((n) =>
        n.id === activeNode.id
          ? {
            ...n,
            data: {
              ...n.data,
              ...(field === "title"
                ? { title: value }
                : {
                  config: {
                    ...n.data.config,
                    [field]: value,
                  },
                }),
            },
          }
          : n
      )
    );

    setActiveNode((prev) => ({
      ...prev,
      data: {
        ...prev.data,
        ...(field === "title"
          ? { title: value }
          : {
            config: {
              ...prev.data.config,
              [field]: value,
            },
          }),
      },
    }));
  };

  // --- Delete
  const removeNode = () => {
    if (!activeNode) return;
    setWorkflowNodes((nds) =>
      nds.filter((n) => n.id !== activeNode.id)
    );
    setConnections((eds) =>
      eds.filter(
        (e) =>
          e.source !== activeNode.id && e.target !== activeNode.id
      )
    );
    setActiveNode(null);
    setIsModalOpen(false);
  };

  const removeEdge = () => {
    if (!activeEdge) return;
    setConnections((eds) =>
      eds.filter((e) => e.id !== activeEdge.id)
    );
    setActiveEdge(null);
  };

  // --- Graph traversal simulation (BFS from Start)
  const executeFlow = () => {
    if (workflowNodes.length === 0) return;

    const start = workflowNodes.find(
      (n) => n.data.category === "Start"
    );
    if (!start) {
      setLogs(["No Start node found"]);
      return;
    }

    const adj = {};
    connections.forEach((e) => {
      if (!adj[e.source]) adj[e.source] = [];
      adj[e.source].push(e.target);
    });

    const visited = new Set();
    const queue = [start.id];
    const steps = [];

    while (queue.length) {
      const curr = queue.shift();
      if (visited.has(curr)) continue;
      visited.add(curr);

      const node = workflowNodes.find((n) => n.id === curr);
      if (!node) continue;

      steps.push(
        `${node.data.category} → ${node.data.title}`
      );

      (adj[curr] || []).forEach((nxt) => {
        if (!visited.has(nxt)) queue.push(nxt);
      });
    }

    setLogs(steps);
  };

  // --- Simple color by type (visual difference)
  const nodeStyle = (node) => {
    const map = {
      Start: "#d1fae5",
      Task: "#e0f2fe",
      Approval: "#fef3c7",
      Automated: "#ede9fe",
      End: "#fee2e2",
    };
    return {
      border: "1px solid #333",
      padding: 8,
      borderRadius: 8,
      background: map[node.data.category] || "#fff",
    };
  };

  // Memoize nodes with style label
  const styledNodes = useMemo(
    () =>
      workflowNodes.map((n) => ({
        ...n,
        data: {
          ...n.data,
          label: (
            <div style={nodeStyle(n)}>
              <b>{n.data.category}</b>
              <div>{n.data.title}</div>
            </div>
          ),
        },
      })),
    [workflowNodes]
  );

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      {/* 🔝 Top Toolbar (different from sidebar) */}
      <div style={{ padding: 10, background: "#111", color: "#fff" }}>
        <b>Workflow Builder</b>{" "}
        <button onClick={() => createNode("Start")}>Start</button>
        <button onClick={() => createNode("Task")}>Task</button>
        <button onClick={() => createNode("Approval")}>Approval</button>
        <button onClick={() => createNode("Automated")}>Automated</button>
        <button onClick={() => createNode("End")}>End</button>
        <button onClick={executeFlow}>Run</button>
      </div>

      {/* Canvas */}
      <div style={{ flex: 1 }}>
        <ReactFlow
          nodes={styledNodes}
          edges={connections}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onEdgeClick={onEdgeClick}
          panOnDrag={false}
          fitView
        >
          <Background />
          <Controls />
        </ReactFlow>
      </div>

      {/* Bottom logs (different placement) */}
      <div style={{ padding: 10, background: "#f3f4f6" }}>
        <b>Execution:</b>
        {logs.length ? logs.map((l, i) => <div key={i}>{l}</div>) : " None"}
      </div>

      {/* Modal (instead of right panel) */}
      {isModalOpen && activeNode && (
        <div
          style={{
            position: "fixed",
            top: 80,
            left: "50%",
            transform: "translateX(-50%)",
            background: "#fff",
            padding: 20,
            border: "1px solid #ccc",
            borderRadius: 10,
            zIndex: 1000,
          }}
        >
          <h3>{activeNode.data.category} Settings</h3>

          <input
            placeholder="Title"
            value={activeNode.data.title}
            onChange={(e) => updateNode("title", e.target.value)}
          />
          <br /><br />

          {activeNode.data.category === "Task" && (
            <>
              <input
                placeholder="Description"
                value={activeNode.data.config.description || ""}
                onChange={(e) =>
                  updateNode("description", e.target.value)
                }
              />
              <br /><br />
              <input
                placeholder="Assignee"
                value={activeNode.data.config.assignee || ""}
                onChange={(e) =>
                  updateNode("assignee", e.target.value)
                }
              />
            </>
          )}

          {activeNode.data.category === "Approval" && (
            <>
              <input
                placeholder="Role"
                value={activeNode.data.config.role || ""}
                onChange={(e) =>
                  updateNode("role", e.target.value)
                }
              />
              <br /><br />
              <input
                placeholder="Threshold"
                value={activeNode.data.config.threshold || ""}
                onChange={(e) =>
                  updateNode("threshold", e.target.value)
                }
              />
            </>
          )}

          <br /><br />
          <button onClick={removeNode} style={{ color: "red" }}>
            Delete Node
          </button>
          <button onClick={() => setIsModalOpen(false)}>
            Close
          </button>
        </div>
      )}

      {/* Edge delete (simple floating button) */}
      {activeEdge && (
        <button
          onClick={removeEdge}
          style={{
            position: "fixed",
            bottom: 20,
            right: 20,
            background: "red",
            color: "#fff",
            padding: 10,
          }}
        >
          Delete Connection
        </button>
      )}
    </div>
  );
}

export default App;