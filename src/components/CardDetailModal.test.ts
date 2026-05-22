import { createElement } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";
import { CardDetailModal } from "./CardDetailModal";

afterEach(() => cleanup());

describe("CardDetailModal", () => {
  test("renders the full card effect without truncating it", () => {
    render(createElement(CardDetailModal, { cardId: "alter-the-future-5x", onClose: () => {} }));

    expect(screen.getByRole("dialog", { name: /Chi tiết lá bài Alter the Future 5x/i })).toBeTruthy();
    expect(screen.getAllByText(/Xem và sắp xếp lại năm lá trên cùng của xấp rút theo ý bạn/i).length).toBeGreaterThan(0);
    expect(screen.getByText("Chức năng")).toBeTruthy();
  });

  test("shows the maximum 8-player game count for exploding kittens", () => {
    render(createElement(CardDetailModal, { cardId: "exploding-kitten", onClose: () => {} }));

    expect(screen.getByText("Tối đa trong ván 8 người")).toBeTruthy();
    expect(screen.getByText("7")).toBeTruthy();
  });

  test("shows the maximum 8-player game count for defuse cards", () => {
    render(createElement(CardDetailModal, { cardId: "defuse", onClose: () => {} }));

    expect(screen.getByText("Tối đa trong ván 8 người")).toBeTruthy();
    expect(screen.getByText("9")).toBeTruthy();
  });

  test("keeps catalog copy count for normal cards", () => {
    render(createElement(CardDetailModal, { cardId: "nope", onClose: () => {} }));

    expect(screen.getByText("Số lá trong bộ gốc")).toBeTruthy();
    expect(screen.getByText("5")).toBeTruthy();
  });

  test("closes when the close button is clicked", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(createElement(CardDetailModal, { cardId: "defuse", onClose }));
    await user.click(screen.getByRole("button", { name: /^đóng chi tiết lá bài$/i }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test("closes when Escape is pressed", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(createElement(CardDetailModal, { cardId: "defuse", onClose }));
    await user.keyboard("{Escape}");

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
