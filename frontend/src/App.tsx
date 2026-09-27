import { useEffect, useState } from "react";
import "./App.css";

type AppInfo = {
  name: string;
  version: string;
  platform: string;
};

function App() {
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null);

  useEffect(() => {
    const loadAppInfo = async () => {
      try {
        const info = await window.desktopAPI.getAppInfo();

        setAppInfo(info);
      } catch (error) {
        console.error("Failed to get Electron information:", error);
      }
    };

    loadAppInfo();
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
            React is now running inside the Electron desktop application.
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
        </section>
      </main>
    </div>
  );
}

export default App;