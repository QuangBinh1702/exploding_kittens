import { createElement } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";
import { CardView } from "./CardView";

afterEach(() => cleanup());

describe("CardView", () => {
  test("can render as an accessible detail button", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(createElement(CardView, { cardId: "defuse", density: "mini", onClick }));
    await user.click(screen.getByRole("button", { name: /xem chi tiết lá bài defuse/i }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
