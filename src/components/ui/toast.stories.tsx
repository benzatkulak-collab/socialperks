import type { Meta, StoryObj } from "@storybook/react";
import { useEffect } from "react";
import { ToastContainer, showToast, dismissToast } from "./toast";
import type { Toast } from "./toast";

const meta: Meta = {
  title: "UI/Toast",
  parameters: {
    layout: "fullscreen",
  },
  decorators: [
    (Story) => (
      <div style={{ minHeight: 300, background: "#0C0F1A", padding: 24, position: "relative" }}>
        <Story />
        <ToastContainer />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj;

function ToastTrigger({ type, message, duration }: { type: Toast["type"]; message: string; duration?: number }) {
  useEffect(() => {
    const id = showToast(type, message, duration ?? 120000);
    return () => {
      if (typeof id === "string") dismissToast(id);
    };
  }, [type, message, duration]);
  return null;
}

export const Success: Story = {
  render: () => <ToastTrigger type="success" message="Campaign launched successfully! Your perk is now live." />,
};

export const Error: Story = {
  render: () => <ToastTrigger type="error" message="Failed to submit proof. Please check your file and try again." />,
};

export const Warning: Story = {
  render: () => <ToastTrigger type="warning" message="Your campaign budget is 90% spent. Consider increasing the cap." />,
};

export const Info: Story = {
  render: () => <ToastTrigger type="info" message="New submission received for your Instagram campaign." />,
};

export const AllTypes: Story = {
  render: function AllTypesStory() {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <p style={{ color: "#636B8A", fontSize: 14, marginBottom: 8 }}>
          Click buttons to show toasts:
        </p>
        {(["success", "error", "warning", "info"] as const).map((type) => (
          <button
            key={type}
            onClick={() => showToast(type, `This is a ${type} toast notification.`)}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              border: "1px solid #2A2F45",
              background: "#141825",
              color: "#E8EAF0",
              cursor: "pointer",
              fontSize: 14,
              textTransform: "capitalize",
            }}
          >
            Show {type} toast
          </button>
        ))}
      </div>
    );
  },
};

export const AutoDismiss: Story = {
  render: function AutoDismissStory() {
    return (
      <div>
        <p style={{ color: "#636B8A", fontSize: 14, marginBottom: 12 }}>
          Click to show a toast that auto-dismisses after 3 seconds:
        </p>
        <button
          onClick={() => showToast("info", "This will disappear in 3 seconds.", 3000)}
          style={{
            padding: "8px 16px",
            borderRadius: 8,
            border: "1px solid #2A2F45",
            background: "#141825",
            color: "#E8EAF0",
            cursor: "pointer",
            fontSize: 14,
          }}
        >
          Show auto-dismiss toast
        </button>
      </div>
    );
  },
};

export const Stacked: Story = {
  render: function StackedStory() {
    return (
      <div>
        <p style={{ color: "#636B8A", fontSize: 14, marginBottom: 12 }}>
          Click to stack multiple toasts:
        </p>
        <button
          onClick={() => {
            showToast("success", "First: Campaign created.", 30000);
            setTimeout(() => showToast("info", "Second: Influencer matched.", 30000), 200);
            setTimeout(() => showToast("warning", "Third: Budget alert.", 30000), 400);
          }}
          style={{
            padding: "8px 16px",
            borderRadius: 8,
            border: "1px solid #2A2F45",
            background: "#141825",
            color: "#E8EAF0",
            cursor: "pointer",
            fontSize: 14,
          }}
        >
          Show 3 stacked toasts
        </button>
      </div>
    );
  },
};
