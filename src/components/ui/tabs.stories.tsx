import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { Tabs } from "./tabs";

const meta: Meta<typeof Tabs> = {
  title: "UI/Tabs",
  component: Tabs,
  argTypes: {
    variant: { control: "select", options: ["pills", "underline"] },
    size: { control: "select", options: ["sm", "md"] },
  },
  parameters: {
    layout: "centered",
  },
  decorators: [
    (Story) => (
      <div style={{ width: 500, background: "#0C0F1A", padding: 24, borderRadius: 12 }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof Tabs>;

const basicTabs = [
  { id: "overview", label: "Overview" },
  { id: "campaigns", label: "Campaigns" },
  { id: "analytics", label: "Analytics" },
];

export const Basic: Story = {
  render: function BasicStory() {
    const [active, setActive] = useState("overview");
    return (
      <Tabs tabs={basicTabs} activeTab={active} onChange={setActive} />
    );
  },
};

export const Underline: Story = {
  render: function UnderlineStory() {
    const [active, setActive] = useState("overview");
    return (
      <Tabs
        tabs={basicTabs}
        activeTab={active}
        onChange={setActive}
        variant="underline"
      />
    );
  },
};

const tabsWithIcons = [
  {
    id: "campaigns",
    label: "Campaigns",
    icon: <span style={{ fontSize: 14 }}>&#9672;</span>,
    count: 12,
  },
  {
    id: "submissions",
    label: "Submissions",
    icon: <span style={{ fontSize: 14 }}>&#9998;</span>,
    count: 5,
  },
  {
    id: "perks",
    label: "Perks",
    icon: <span style={{ fontSize: 14 }}>&#9733;</span>,
    count: 28,
  },
];

export const WithIcons: Story = {
  render: function IconsStory() {
    const [active, setActive] = useState("campaigns");
    return (
      <Tabs tabs={tabsWithIcons} activeTab={active} onChange={setActive} />
    );
  },
};

export const WithIconsUnderline: Story = {
  render: function IconsUnderlineStory() {
    const [active, setActive] = useState("campaigns");
    return (
      <Tabs
        tabs={tabsWithIcons}
        activeTab={active}
        onChange={setActive}
        variant="underline"
      />
    );
  },
};

export const Controlled: Story = {
  render: function ControlledStory() {
    const [active, setActive] = useState("tab1");
    const tabs = [
      { id: "tab1", label: "First" },
      { id: "tab2", label: "Second" },
      { id: "tab3", label: "Third" },
    ];
    return (
      <div>
        <Tabs tabs={tabs} activeTab={active} onChange={setActive} />
        <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActive(t.id)}
              style={{
                padding: "4px 12px",
                fontSize: 12,
                borderRadius: 6,
                border: "1px solid #2A2F45",
                background: active === t.id ? "#22D3EE14" : "transparent",
                color: active === t.id ? "#22D3EE" : "#636B8A",
                cursor: "pointer",
              }}
            >
              Set to {t.label}
            </button>
          ))}
        </div>
        <p style={{ marginTop: 12, color: "#636B8A", fontSize: 13, fontFamily: "monospace" }}>
          Active: {active}
        </p>
      </div>
    );
  },
};

export const SmallSize: Story = {
  render: function SmallSizeStory() {
    const [active, setActive] = useState("overview");
    return (
      <Tabs tabs={basicTabs} activeTab={active} onChange={setActive} size="sm" />
    );
  },
};
