import type { Meta, StoryObj } from "@storybook/react";
import { Card } from "./card";

const meta: Meta<typeof Card> = {
  title: "UI/Card",
  component: Card,
  argTypes: {
    padding: { control: "select", options: ["none", "sm", "md", "lg"] },
    hoverable: { control: "boolean" },
    borderColor: {
      control: "select",
      options: [undefined, "cyan", "green", "amber", "red", "purple", "pink", "orange", "muted"],
    },
  },
  parameters: {
    layout: "centered",
  },
  decorators: [
    (Story) => (
      <div style={{ width: 400 }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof Card>;

export const Default: Story = {
  args: {
    children: (
      <div>
        <h3 style={{ color: "#FAFBFD", fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
          Campaign Performance
        </h3>
        <p style={{ color: "#636B8A", fontSize: 14 }}>
          Your latest campaign has reached 1,234 impressions across 3 platforms.
        </p>
      </div>
    ),
    padding: "md",
  },
};

export const WithHeader: Story = {
  args: {
    padding: "none",
    children: (
      <>
        <div style={{ padding: "16px 24px", borderBottom: "1px solid #2A2F45" }}>
          <h3 style={{ color: "#FAFBFD", fontSize: 16, fontWeight: 600 }}>
            Weekly Summary
          </h3>
        </div>
        <div style={{ padding: 24 }}>
          <p style={{ color: "#636B8A", fontSize: 14 }}>
            12 new submissions received this week. 8 approved, 2 pending review.
          </p>
        </div>
      </>
    ),
  },
};

export const WithFooter: Story = {
  args: {
    padding: "none",
    children: (
      <>
        <div style={{ padding: 24 }}>
          <h3 style={{ color: "#FAFBFD", fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
            Perk Program
          </h3>
          <p style={{ color: "#636B8A", fontSize: 14 }}>
            15% cashback on all approved social media posts.
          </p>
        </div>
        <div style={{ padding: "12px 24px", borderTop: "1px solid #2A2F45", display: "flex", justifyContent: "flex-end" }}>
          <button style={{ color: "#22D3EE", fontSize: 14, background: "none", border: "none", cursor: "pointer" }}>
            View Details
          </button>
        </div>
      </>
    ),
  },
};

export const Interactive: Story = {
  args: {
    hoverable: true,
    onClick: () => alert("Card clicked!"),
    borderColor: "cyan",
    children: (
      <div>
        <h3 style={{ color: "#FAFBFD", fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
          Clickable Card
        </h3>
        <p style={{ color: "#636B8A", fontSize: 14 }}>
          Hover to see the lift effect. Click to trigger an action.
        </p>
      </div>
    ),
  },
};

export const TierBorders: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {(["green", "orange", "cyan", "pink", "muted"] as const).map((color) => (
        <Card key={color} borderColor={color}>
          <h3 style={{ color: "#FAFBFD", fontSize: 14, fontWeight: 600, textTransform: "capitalize" }}>
            {color} tier
          </h3>
          <p style={{ color: "#636B8A", fontSize: 13, marginTop: 4 }}>
            Left border indicates campaign tier classification.
          </p>
        </Card>
      ))}
    </div>
  ),
};

export const PaddingVariants: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {(["none", "sm", "md", "lg"] as const).map((p) => (
        <Card key={p} padding={p}>
          <div style={{ background: "#22D3EE14", padding: 8, borderRadius: 4 }}>
            <p style={{ color: "#22D3EE", fontSize: 13, fontFamily: "monospace" }}>
              padding=&quot;{p}&quot;
            </p>
          </div>
        </Card>
      ))}
    </div>
  ),
};
