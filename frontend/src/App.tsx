import { useEffect, useState } from "react";
import "./App.css";

type AppInfo = {
  name: string;
  version: string;
  platform: string;
};

type DatabaseStatus = {
  success: boolean;
  path?: string;
  tableCount?: number;
  tables?: string[];
  error?: string;
};

function App() {
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null);
  const [databaseStatus, setDatabaseStatus] =
    useState<DatabaseStatus | null>(null);

  useEffect(() => {
    const loadSystemInformation = async () => {
      try {
        const info = await window.desktopAPI.getAppInfo();

        const database = await window.desktopAPI.database.getStatus();

        setAppInfo(info);
        setDatabaseStatus(database);
      } catch (error) {
        console.error(
          "Failed to load system information:",
          error
        );
      }
    };

    loadSystemInformation();
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <p className="eyebrow">OFFLINE POS</p>

          <h1>Offline Billing Software</h1>

          <p className="subtitle">
            Offline-first desktop billing and inventory management
          </p>
        </div>

        <div className="status">
          <span className="status-dot"></span>
          Electron Desktop
        </div>
      </header>

      <main className="content">
        <section className="card">
          <p className="label">SYSTEM STATUS</p>

          <h2>Electron is running successfully.</h2>

          <p className="description">
            React is running inside the Electron desktop application.
          </p>

          {appInfo && (
            <div className="info-grid">
              <div className="info-box">
                <span>Application</span>
                <strong>{appInfo.name}</strong>
              </div>

              <div className="info-box">
                <span>Version</span>
                <strong>{appInfo.version}</strong>
              </div>

              <div className="info-box">
                <span>Platform</span>
                <strong>{appInfo.platform}</strong>
              </div>
            </div>
          )}

          <div className="database-section">
            <p className="label">DATABASE STATUS</p>

            {databaseStatus === null && (
              <p className="description">
                Checking SQLite database...
              </p>
            )}

            {databaseStatus?.success && (
              <>
                <div className="info-grid">
                  <div className="info-box">
                    <span>Database</span>
                    <strong>SQLite</strong>
                  </div>

                  <div className="info-box">
                    <span>Tables</span>
                    <strong>
                      {databaseStatus.tableCount}
                    </strong>
                  </div>

                  <div className="info-box">
                    <span>Status</span>
                    <strong>Connected</strong>
                  </div>
                </div>

                <div className="tables-section">
                  <h3>Created Tables</h3>

                  <div className="table-list">
                    {databaseStatus.tables?.map((table) => (
                      <span key={table}>{table}</span>
                    ))}
                  </div>
                </div>

                {databaseStatus.path && (
                  <div className="database-path">
                    <span>Database Location</span>

                    <strong>{databaseStatus.path}</strong>
                  </div>
                )}
              </>
            )}

            {databaseStatus && !databaseStatus.success && (
              <div className="error-box">
                <strong>SQLite connection failed</strong>

                <p>{databaseStatus.error}</p>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;