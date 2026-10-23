import { describe, expect, it } from "vitest";
import { groupVotings, myVotingState } from "./list";

describe("myVotingState", () => {
  it("cerrada le gana a todo", () => {
    expect(myVotingState({ phase: "closed", played: true, total: 8, rated: 0, mvpVoted: false })).toBe("closed");
  });

  it("si no jugué, solo miro", () => {
    expect(myVotingState({ phase: "open", played: false, total: 0, rated: 0, mvpVoted: false })).toBe("watching");
  });

  it("me falta votar si queda alguien o el MVP", () => {
    expect(myVotingState({ phase: "open", played: true, total: 8, rated: 5, mvpVoted: true })).toBe("pending");
    expect(myVotingState({ phase: "open", played: true, total: 8, rated: 8, mvpVoted: false })).toBe("pending");
  });

  it("ya voté si califiqué a todos y elegí MVP", () => {
    expect(myVotingState({ phase: "open", played: true, total: 8, rated: 8, mvpVoted: true })).toBe("done");
  });
});

describe("groupVotings", () => {
  it("agrupa por estado sin cambiar el orden", () => {
    const items = [
      { id: 1, state: "closed" as const },
      { id: 2, state: "pending" as const },
      { id: 3, state: "pending" as const },
      { id: 4, state: "done" as const },
    ];
    const sections = groupVotings(items);
    expect(sections.pending.map((i) => i.id)).toEqual([2, 3]);
    expect(sections.done.map((i) => i.id)).toEqual([4]);
    expect(sections.closed.map((i) => i.id)).toEqual([1]);
    expect(sections.watching).toEqual([]);
  });
});
