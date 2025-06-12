import React, { useState } from 'react';

const AIDebugPanel = ({ logs, visible }) => {
  const [expanded, setExpanded] = useState(false);

  if (!visible || !logs || logs.length === 0) {
    return null;
  }

  return (
    <div className="ai-debug-panel">
      <div className="ai-debug-header" onClick={() => setExpanded(!expanded)}>
        <h3>AI Debug Logs {expanded ? '▼' : '▶'}</h3>
        <span className="ai-debug-count">{logs.length} entries</span>
      </div>
      
      {expanded && (
        <div className="ai-debug-content">
          {logs.map((log, index) => (
            <div key={index} className={`ai-debug-entry ai-debug-${log.type}`}>
              <div className="ai-debug-entry-header">
                <span className="ai-debug-type">{log.type}</span>
                <span className="ai-debug-time">{new Date(log.timestamp).toLocaleTimeString()}</span>
              </div>
              <pre className="ai-debug-data">
                {typeof log.data === 'string' ? log.data : JSON.stringify(log.data, null, 2)}
              </pre>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AIDebugPanel; 