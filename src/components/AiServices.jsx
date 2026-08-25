// src/components/AiServices.jsx
import React, { useState } from "react";
import { ChevronLeft, Plus, ChevronDown, ChevronRight, Trash2 } from "lucide-react";
import { newKeyId, newModelId, newProviderId } from "../lib/aiProviders";

function maskKey(value) {
    if (!value) return "";
    if (value.length <= 8) return "••••" + value.slice(-2);
    return `${value.slice(0, 4)}••••${value.slice(-4)}`;
}

export default function AiServices({ providers, onChange, onBack, showFeedback }) {
    const [activeTab, setActiveTab] = useState(providers[0]?.id || "add");
    const [keysExpanded, setKeysExpanded] = useState(false);
    const [modelsExpanded, setModelsExpanded] = useState(false);
    const [keyInput, setKeyInput] = useState("");
    const [modelInput, setModelInput] = useState("");
    const [newName, setNewName] = useState("");
    const [newBaseUrl, setNewBaseUrl] = useState("");

    const activeProvider = providers.find((p) => p.id === activeTab);

    const updateProvider = (providerId, updater) => {
        const next = providers.map((p) => (p.id === providerId ? updater(p) : p));
        onChange(next);
    };
    const handleDeleteProvider = () => {
        if (!activeProvider) return;

        const confirmed = window.confirm(
            `Delete "${activeProvider.name}" and all its API keys and models?`
        );

        if (!confirmed) return;

        const nextProviders = providers.filter(
            (p) => p.id !== activeProvider.id
        );

        onChange(nextProviders);

        // Go to another provider, or Add screen if none remain
        setActiveTab(nextProviders[0]?.id || "add");

        // Reset expanded sections
        setKeysExpanded(false);
        setModelsExpanded(false);

        showFeedback?.("Provider deleted!", "success");
    };
    const handleAddKey = () => {
        const value = keyInput.trim();
        if (!value || !activeProvider) return;
        updateProvider(activeProvider.id, (p) => ({
            ...p,
            apiKeys: [...p.apiKeys, { id: newKeyId(), value, status: "active" }],
        }));
        setKeyInput("");
        showFeedback?.("API key added!", "success");
    };

    const handleDeleteKey = (keyId) => {
        updateProvider(activeProvider.id, (p) => ({
            ...p,
            apiKeys: p.apiKeys.filter((k) => k.id !== keyId),
        }));
    };

    const handleAddModel = () => {
        const name = modelInput.trim();
        if (!name || !activeProvider) return;
        if (activeProvider.models.some((m) => m.name === name)) {
            showFeedback?.("Model already added!", "error");
            return;
        }
        updateProvider(activeProvider.id, (p) => ({
            ...p,
            models: [...p.models, { id: newModelId(), name, status: "active" }],
        }));
        setModelInput("");
        showFeedback?.("Model added!", "success");
    };

    const handleDeleteModel = (modelId) => {
        updateProvider(activeProvider.id, (p) => ({
            ...p,
            models: p.models.filter((m) => m.id !== modelId),
        }));
    };

    const handleToggleModelStatus = (modelId) => {
        updateProvider(activeProvider.id, (p) => ({
            ...p,
            models: p.models.map((m) =>
                m.id === modelId ? { ...m, status: m.status === "active" ? "disabled" : "active" } : m
            ),
        }));
    };

    const handleAddProvider = () => {
        const name = newName.trim();
        const baseUrl = newBaseUrl.trim();
        if (!name || !baseUrl) {
            showFeedback?.("Name and base URL are required!", "error");
            return;
        }
        const provider = { id: newProviderId(), name, baseUrl, apiKeys: [], models: [] };
        onChange([...providers, provider]);
        setActiveTab(provider.id);
        setNewName("");
        setNewBaseUrl("");
        showFeedback?.("Provider added!", "success");
    };

    return (
        <div className="settings-page">


            <div className="ai-services-tabs">
                {providers.map((p) => (
                    <button
                        key={p.id}
                        className={`ai-services-tab ${activeTab === p.id ? "active" : ""}`}
                        onClick={() => setActiveTab(p.id)}
                    >
                        {p.name}
                    </button>
                ))}
                <button
                    className={`ai-services-tab ai-services-tab-add ${activeTab === "add" ? "active" : ""}`}
                    onClick={() => setActiveTab("add")}
                    title="Add provider"
                >
                    <Plus size={14} strokeWidth={1.5} />
                </button>
            </div>

            {activeTab === "add" || !activeProvider ? (
                <div className="ai-provider-form">
                    <input
                        type="text"
                        placeholder="name"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                    />
                    <input
                        type="text"
                        placeholder="Enter the baseurl"
                        value={newBaseUrl}
                        onChange={(e) => setNewBaseUrl(e.target.value)}
                    />
                    <button className="ai-provider-add-btn" onClick={handleAddProvider}>
                        Add
                    </button>
                </div>
            ) : (
                <div className="ai-service-content">
                    {/* API keys */}
                    <div className="ai-service-section">
                        <div className="ai-service-section-header">
                            <input
                                type="text"
                                className="ai-service-input"
                                placeholder="Paste API key"
                                value={keyInput}
                                onChange={(e) => setKeyInput(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleAddKey()}
                            />
                            <button className="ai-service-icon-btn" onClick={handleAddKey} title="Add key">
                                <Plus size={14} strokeWidth={1.5} />
                            </button>
                            <button
                                className="ai-service-icon-btn"
                                onClick={() => setKeysExpanded((v) => !v)}
                                title={keysExpanded ? "Collapse" : "Expand"}
                            >
                                <ChevronDown
                                    size={14}
                                    strokeWidth={1.5}
                                    style={{ transform: keysExpanded ? "rotate(0deg)" : "rotate(-90deg)" }}
                                />
                            </button>
                        </div>
                        {keysExpanded && (
                            <div className="ai-service-list">
                                {activeProvider.apiKeys.length === 0 ? (
                                    <div className="ai-service-empty">No API keys yet</div>
                                ) : (
                                    activeProvider.apiKeys.map((k) => (
                                        <div key={k.id} className="ai-service-row">
                                            <span className="ai-service-row-name">{maskKey(k.value)}</span>
                                            <button
                                                className="ai-service-row-delete"
                                                onClick={() => handleDeleteKey(k.id)}
                                                title="Delete key"
                                            >
                                                <Trash2 size={14} strokeWidth={1.5} />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>

                    {/* Models */}
                    <div className="ai-service-section">
                        <div className="ai-service-section-header">
                            <input
                                type="text"
                                className="ai-service-input"
                                placeholder="Model"
                                value={modelInput}
                                onChange={(e) => setModelInput(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleAddModel()}
                            />
                            <button className="ai-service-icon-btn" onClick={handleAddModel} title="Add model">
                                <Plus size={14} strokeWidth={1.5} />
                            </button>
                            <button
                                className="ai-service-icon-btn"
                                onClick={() => setModelsExpanded((v) => !v)}
                                title={modelsExpanded ? "Collapse" : "Expand"}
                            >
                                <ChevronRight
                                    size={14}
                                    strokeWidth={1.5}
                                    style={{ transform: modelsExpanded ? "rotate(90deg)" : "rotate(0deg)" }}
                                />
                            </button>
                        </div>
                        {modelsExpanded && (
                            <div className="ai-service-list">
                                {activeProvider.models.length === 0 ? (
                                    <div className="ai-service-empty">No models yet</div>
                                ) : (
                                    activeProvider.models.map((m) => (
                                        <div key={m.id} className="ai-service-row">
                                            <span className="ai-service-row-name">{m.name}</span>
                                            <button
                                                className={`ai-service-status-btn ${m.status}`}
                                                onClick={() => handleToggleModelStatus(m.id)}
                                            >
                                                {m.status === "active" ? "Active" : "Disabled"}
                                            </button>
                                            <button
                                                className="ai-service-row-delete"
                                                onClick={() => handleDeleteModel(m.id)}
                                                title="Delete model"
                                            >
                                                <Trash2 size={14} strokeWidth={1.5} />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                    {/* Delete */}
                    {/* Delete */}
                    <div className="ai-service-section ai-service-delete-section">
                        <button
                            className="ai-provider-delete-btn"
                            onClick={handleDeleteProvider}
                        >
                            <Trash2 size={14} strokeWidth={1.5} />
                            Delete Provider
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}