import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  Activity, AirVent, ArrowUpRight, Check, ChevronDown, CircleHelp, Clock3, Cpu,
  Droplets, Gauge, LayoutDashboard, LogOut, Plus, Search, Settings2, ShieldCheck,
  Trash2, X
} from "lucide-react";
import { api } from "./api";
import type { CommandLog, Equipment, EquipmentType, Network, User } from "./types";

const sections: { id: "HOME" | EquipmentType; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "HOME", label: "Home", icon: LayoutDashboard },
  { id: "AIR_SENSOR", label: "Sensor de ar", icon: AirVent },
  { id: "MACHINE_MODULE", label: "Módulo de máquina", icon: Cpu },
  { id: "DOSER", label: "Dosadoras", icon: Droplets }
];

const typeLabels: Record<EquipmentType, string> = {
  AIR_SENSOR: "Sensor de ar",
  MACHINE_MODULE: "Módulo de máquina",
  DOSER: "Dosadora"
};

const actionFor: Partial<Record<EquipmentType, string>> = {
  AIR_SENSOR: "AIR_SENSOR_REQUEST",
  MACHINE_MODULE: "MACHINE_MODULE_REQUEST"
};

type EquipmentForm = { name: string; type: EquipmentType; ip: string; port: string };
const blankForm: EquipmentForm = { name: "", type: "AIR_SENSOR", ip: "", port: "80" };

function App() {
  const [token, setToken] = useState(() => localStorage.getItem("equipment-token") ?? "");
  const [user, setUser] = useState<User | null>(() => {
    const raw = localStorage.getItem("equipment-user");
    return raw ? JSON.parse(raw) as User : null;
  });
  const [networks, setNetworks] = useState<Network[]>([]);
  const [networkId, setNetworkId] = useState("");
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [history, setHistory] = useState<CommandLog[]>([]);
  const [section, setSection] = useState<"HOME" | EquipmentType>("HOME");
  const [query, setQuery] = useState("");
  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState<Equipment | null>(null);
  const [form, setForm] = useState<EquipmentForm>(blankForm);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [login, setLogin] = useState({ email: "", password: "" });

  const request = useCallback(<T,>(path: string, options?: RequestInit) => api<T>(path, token, options), [token]);
  const load = useCallback(async () => {
    if (!token) return;
    try {
      const availableNetworks = await request<Network[]>("/networks/me");
      setNetworks(availableNetworks);
      const activeNetworkId = networkId && availableNetworks.some((n) => n.id === networkId)
        ? networkId
        : availableNetworks[0]?.id ?? "";
      setNetworkId(activeNetworkId);
      if (!activeNetworkId) {
        setEquipment([]);
        setHistory([]);
        return;
      }
      const [devices, logs] = await Promise.all([
        request<Equipment[]>(`/equipments?networkId=${encodeURIComponent(activeNetworkId)}`),
        request<CommandLog[]>(`/commands?networkId=${encodeURIComponent(activeNetworkId)}`)
      ]);
      setEquipment(devices);
      setHistory(logs);
      setError("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível carregar os dados.");
    }
  }, [networkId, request, token]);

  useEffect(() => { void load(); }, [load]);

  const visibleEquipment = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("pt-BR");
    return equipment.filter((item) =>
      (section === "HOME" || item.type === section) &&
      (!normalized || `${item.name} ${item.ip}`.toLocaleLowerCase("pt-BR").includes(normalized))
    );
  }, [equipment, query, section]);

  function logout() {
    localStorage.removeItem("equipment-token");
    localStorage.removeItem("equipment-user");
    setToken("");
    setUser(null);
    setNetworks([]);
    setEquipment([]);
    setHistory([]);
  }

  async function signIn(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await api<{ accessToken: string; user: User }>("/auth/login", "", {
        method: "POST", body: JSON.stringify(login)
      });
      localStorage.setItem("equipment-token", result.accessToken);
      localStorage.setItem("equipment-user", JSON.stringify(result.user));
      setToken(result.accessToken);
      setUser(result.user);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Falha ao entrar.");
    } finally {
      setBusy(false);
    }
  }

  function openCreate(type?: EquipmentType) {
    setEditing(null);
    setForm({ ...blankForm, type: type ?? (section === "HOME" ? "AIR_SENSOR" : section) });
    setDialog(true);
  }

  function openEdit(item: Equipment) {
    setEditing(item);
    setForm({ name: item.name, type: item.type, ip: item.ip, port: String(item.port) });
    setDialog(true);
  }

  async function saveEquipment(event: FormEvent) {
    event.preventDefault();
    if (!networkId) return;
    setBusy(true);
    setError("");
    try {
      const payload = { ...form, port: Number(form.port) };
      await request(editing ? `/equipments/${editing.id}` : `/equipments?networkId=${encodeURIComponent(networkId)}`, {
        method: editing ? "PUT" : "POST",
        body: JSON.stringify(payload)
      });
      setDialog(false);
      setNotice(editing ? "Equipamento atualizado." : "Equipamento cadastrado.");
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível salvar o equipamento.");
    } finally {
      setBusy(false);
    }
  }

  async function removeEquipment(item: Equipment) {
    if (!window.confirm(`Excluir "${item.name}" e seu histórico de comandos?`)) return;
    try {
      await request(`/equipments/${item.id}`, { method: "DELETE" });
      setNotice("Equipamento excluído.");
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível excluir.");
    }
  }

  async function sendCommand(item: Equipment) {
    const action = actionFor[item.type];
    if (!action) return;
    setBusy(true);
    setError("");
    try {
      const result = await request<CommandLog>(`/equipments/${item.id}/commands`, {
        method: "POST", body: JSON.stringify({ action })
      });
      setNotice(result.success
        ? `GET ${result.path} respondeu HTTP ${result.statusCode}.`
        : result.errorMessage ?? `Solicitação GET ${result.path} falhou.`);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Falha ao enviar a solicitação.");
    } finally {
      setBusy(false);
    }
  }

  if (!token) {
    return (
      <main className="login-screen">
        <form className="login-card" onSubmit={signIn}>
          <div className="brand-mark"><Gauge size={23} /></div>
          <p className="eyebrow">HITEST · EQUIPAMENTOS</p>
          <h1>Bem-vindo de volta</h1>
          <p className="muted">Acesse o painel da sua rede industrial.</p>
          <label>E-mail<input type="email" autoComplete="username" value={login.email} onChange={(e) => setLogin({ ...login, email: e.target.value })} required /></label>
          <label>Senha<input type="password" autoComplete="current-password" value={login.password} onChange={(e) => setLogin({ ...login, password: e.target.value })} required minLength={8} /></label>
          {error && <div className="alert error">{error}</div>}
          <button className="button primary full" disabled={busy}>{busy ? "Entrando..." : "Entrar"} <ArrowUpRight size={16} /></button>
          <p className="login-foot"><ShieldCheck size={14} /> Acesso protegido por rede</p>
        </form>
      </main>
    );
  }

  const activeSection = sections.find((item) => item.id === section)!;
  const count = (type: EquipmentType) => equipment.filter((item) => item.type === type).length;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark"><Gauge size={21} /></div><span>hi<span className="brand-accent">test</span><small>CONTROLE INDUSTRIAL</small></span></div>
        <div className="nav-caption">MENU PRINCIPAL</div>
        <nav>{sections.map(({ id, label, icon: Icon }) => (
          <button key={id} className={`nav-item ${section === id ? "active" : ""}`} onClick={() => setSection(id)}>
            <Icon size={18} /><span>{label}</span>{id !== "HOME" && <span className="nav-count">{count(id)}</span>}
          </button>
        ))}</nav>
        <div className="sidebar-bottom">
          <div className="network-status"><span className="online-dot" /><div><b>Rede conectada</b><small>Monitoramento ativo</small></div></div>
          <div className="profile"><div className="avatar">{(user?.name ?? "U").slice(0, 1).toUpperCase()}</div><div className="profile-info"><b>{user?.name ?? "Usuário"}</b><small>{user?.email}</small></div><button className="icon-button" title="Sair" onClick={logout}><LogOut size={16} /></button></div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumbs">Painel <span>/</span> <b>{activeSection.label}</b></div>
          <label className="network-select"><span>REDE</span><select aria-label="Rede ativa" value={networkId} onChange={(e) => setNetworkId(e.target.value)}>{networks.map((network) => <option key={network.id} value={network.id}>{network.name}</option>)}</select><ChevronDown size={14} /></label>
        </header>
        <div className="page-content">
          <div className="page-heading">
            <div><p className="eyebrow">{section === "HOME" ? "VISÃO GERAL" : "EQUIPAMENTOS"}</p><h1>{section === "HOME" ? "Painel de controle" : activeSection.label}</h1><p className="muted">{section === "HOME" ? "Acompanhe seus dispositivos e atividades recentes." : `Gerencie os dispositivos de ${activeSection.label.toLocaleLowerCase("pt-BR")}.`}</p></div>
            <button className="button primary" onClick={() => openCreate(section === "HOME" ? undefined : section)} disabled={!networkId}><Plus size={17} /> Novo equipamento</button>
          </div>
          {error && <div className="alert error"><CircleHelp size={17} />{error}<button onClick={() => setError("")}><X size={16} /></button></div>}
          {notice && <div className="alert success"><Check size={17} />{notice}<button onClick={() => setNotice("")}><X size={16} /></button></div>}

          {section === "HOME" && <div className="summary-grid">
            <SummaryCard label="Total de equipamentos" value={equipment.length} icon={Settings2} note="Nesta rede" />
            <SummaryCard label="Sensores de ar" value={count("AIR_SENSOR")} icon={AirVent} note="Disponíveis para consulta" />
            <SummaryCard label="Módulos de máquina" value={count("MACHINE_MODULE")} icon={Cpu} note="Disponíveis para consulta" />
            <SummaryCard label="Dosadoras" value={count("DOSER")} icon={Droplets} note="Cadastro sem comandos" />
          </div>}

          <section className="panel">
            <div className="panel-heading">
              <div><h2>{section === "HOME" ? "Equipamentos" : `Dispositivos · ${activeSection.label}`}</h2><p className="muted">{visibleEquipment.length} {visibleEquipment.length === 1 ? "dispositivo cadastrado" : "dispositivos cadastrados"}</p></div>
              <div className="searchbox"><Search size={16} /><input value={query} placeholder="Buscar por nome ou IP..." onChange={(e) => setQuery(e.target.value)} /></div>
            </div>
            {visibleEquipment.length ? <div className="equipment-grid">{visibleEquipment.map((item) => (
              <EquipmentCard key={item.id} item={item} busy={busy} onEdit={openEdit} onDelete={removeEquipment} onCommand={sendCommand} />
            ))}</div> : <EmptyState onCreate={() => openCreate(section === "HOME" ? undefined : section)} />}
          </section>

          {section === "HOME" && <section className="panel history-panel">
            <div className="panel-heading"><div><h2>Atividade recente</h2><p className="muted">Últimas solicitações enviadas aos equipamentos.</p></div><span className="history-count"><Activity size={15} /> {history.length} registros</span></div>
            {history.length === 0 ? <div className="empty-history"><Clock3 size={18} />As solicitações feitas aparecerão aqui.</div> : <div className="history-list">{history.slice(0, 8).map((log) => <div className="history-row" key={log.id}><div className={`history-icon ${log.success ? "ok" : "fail"}`}>{log.success ? <Check size={16} /> : <X size={16} />}</div><div className="history-main"><b>{log.equipment.name}</b><span>GET {log.path} · {log.user.name}</span></div><div className="history-result">{log.success ? <span className="status-good">HTTP {log.statusCode}</span> : <span className="status-bad">{log.errorMessage ?? "Falha"}</span>}<small>{new Date(log.createdAt).toLocaleString("pt-BR")} · {log.durationMs} ms</small></div></div>)}</div>}
          </section>}
          <footer className="footer"><span>HiTest Equipamentos</span><span><ShieldCheck size={13} /> Operações limitadas por rede e tipo de dispositivo</span></footer>
        </div>
      </main>

      {dialog && <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setDialog(false); }}>
        <form className="modal" onSubmit={saveEquipment}>
          <div className="modal-heading"><div><p className="eyebrow">{editing ? "EDITAR CADASTRO" : "NOVO CADASTRO"}</p><h2>{editing ? "Editar equipamento" : "Adicionar equipamento"}</h2></div><button type="button" className="icon-button close-button" onClick={() => setDialog(false)}><X size={19} /></button></div>
          <label>Nome do equipamento<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex.: Sensor galpão 1" required maxLength={100} /></label>
          <label>Tipo<select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as EquipmentType })}>{Object.entries(typeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <div className="form-row"><label>Endereço IP<input value={form.ip} onChange={(e) => setForm({ ...form, ip: e.target.value })} placeholder="192.168.1.20" inputMode="decimal" required pattern="(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}" title="Informe um endereço IPv4 válido" /></label><label>Porta<input type="number" value={form.port} min={1} max={65535} onChange={(e) => setForm({ ...form, port: e.target.value })} required /></label></div>
          {form.type === "DOSER" && <div className="info-note"><CircleHelp size={16} /> O protocolo e os endpoints da dosadora ainda não foram confirmados. O cadastro não habilita comandos.</div>}
          {error && <div className="alert error">{error}</div>}
          <div className="modal-actions"><button type="button" className="button secondary" onClick={() => setDialog(false)}>Cancelar</button><button className="button primary" disabled={busy}>{busy ? "Salvando..." : editing ? "Salvar alterações" : "Cadastrar equipamento"}</button></div>
        </form>
      </div>}
    </div>
  );
}

function SummaryCard({ label, value, icon: Icon, note }: { label: string; value: number; icon: typeof Gauge; note: string }) {
  return <div className="summary-card"><div className="summary-top"><span>{label}</span><span className="summary-icon"><Icon size={17} /></span></div><strong>{value.toString().padStart(2, "0")}</strong><small>{note}</small></div>;
}

function EquipmentCard({ item, busy, onEdit, onDelete, onCommand }: {
  item: Equipment; busy: boolean; onEdit: (item: Equipment) => void;
  onDelete: (item: Equipment) => void; onCommand: (item: Equipment) => void;
}) {
  const Icon = item.type === "AIR_SENSOR" ? AirVent : item.type === "MACHINE_MODULE" ? Cpu : Droplets;
  const executable = item.type !== "DOSER";
  const path = item.type === "AIR_SENSOR" ? "/airon1" : "/lb";
  return <article className="equipment-card">
    <div className="equipment-card-top"><div className={`device-icon ${item.type.toLowerCase()}`}><Icon size={20} /></div><span className="device-type">{typeLabels[item.type]}</span><div className="card-actions"><button className="icon-button" title="Editar" onClick={() => onEdit(item)}><Settings2 size={16} /></button><button className="icon-button danger-hover" title="Excluir" onClick={() => onDelete(item)}><Trash2 size={16} /></button></div></div>
    <h3>{item.name}</h3><p className="device-address"><span className="online-dot" />{item.ip}<span className="port">:{item.port}</span></p>
    {executable ? <button className="button command-button" onClick={() => onCommand(item)} disabled={busy}><ArrowUpRight size={15} /> Enviar GET <code>{path}</code></button> : <div className="doser-locked"><ShieldCheck size={15} /> Comandos indisponíveis</div>}
  </article>;
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return <div className="empty-state"><div className="empty-illustration"><Gauge size={28} /></div><h3>Nenhum equipamento por aqui</h3><p>Cadastre um dispositivo para começar a acompanhar sua rede.</p><button className="button secondary" onClick={onCreate}><Plus size={16} /> Cadastrar equipamento</button></div>;
}

export default App;
