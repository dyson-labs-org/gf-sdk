"""Satellite datalink simulation with invoice handoff.

This script visualises two satellites orbiting Earth in 2D space. The user can
start and stop the simulation with on-screen buttons. While running, the script
tracks how much time the satellites spend with overlapping datalink coverage
and, therefore, how much data is exchanged. When the simulation ends, the
resulting usage summary is automatically forwarded to the TypeScript
`create-invoice` flow to generate a BTCPayServer invoice.
"""

from __future__ import annotations

import json
import math
import subprocess
import sys
import time
from dataclasses import dataclass
from pathlib import Path
from typing import List

import matplotlib.pyplot as plt
from matplotlib.animation import FuncAnimation
from matplotlib.axes import Axes
from matplotlib.figure import Figure
from matplotlib.patches import Circle
from matplotlib.widgets import Button


EARTH_RADIUS_KM = 6_371
TRANSFER_RATE_MB_PER_SEC = 75.0
PRICE_PER_MB = 0.02


@dataclass
class Satellite:
    name: str
    altitude_km: float
    orbital_velocity_km_s: float
    datalink_range_km: float
    color: str
    initial_phase_rad: float = 0.0

    def __post_init__(self) -> None:
        self.orbital_radius_km = EARTH_RADIUS_KM + self.altitude_km
        self.angular_velocity_rad_s = self.orbital_velocity_km_s / self.orbital_radius_km
        self.angle_rad = self.initial_phase_rad

    def advance(self, dt: float) -> None:
        self.angle_rad = (self.angle_rad + self.angular_velocity_rad_s * dt) % (2 * math.pi)

    def position(self) -> tuple[float, float]:
        return (
            self.orbital_radius_km * math.cos(self.angle_rad),
            self.orbital_radius_km * math.sin(self.angle_rad),
        )


class SatelliteSimulation:
    def __init__(self, satellites: List[Satellite], *, frame_interval_ms: int = 100) -> None:
        if len(satellites) != 2:
            raise ValueError("Exactly two satellites are required for the simulation")

        self.satellites = satellites
        self.frame_interval_ms = frame_interval_ms
        self.running = False
        self.finished = False
        self.elapsed_seconds = 0.0
        self.megabytes_transferred = 0.0
        self.last_frame_time: float | None = None

        self.fig, self.ax = self._build_figure()
        self.satellite_markers: List[Circle] = []
        self.datalink_markers: List[Circle] = []
        self.status_text = self.ax.text(0.02, 0.02, "", transform=self.ax.transAxes, color="white", fontsize=10)
        self._init_artists()

        self.animation = FuncAnimation(
            self.fig,
            self._update,
            interval=self.frame_interval_ms,
            blit=False,
        )

        self._build_buttons()

    def _build_figure(self) -> tuple[Figure, Axes]:
        fig, ax = plt.subplots()
        fig.canvas.manager.set_window_title("Satellite Datalink Simulation")  # type: ignore[attr-defined]
        ax.set_aspect("equal")
        max_orbit = max(s.orbital_radius_km + s.datalink_range_km for s in self.satellites)
        margin = 200
        ax.set_xlim(-max_orbit - margin, max_orbit + margin)
        ax.set_ylim(-max_orbit - margin, max_orbit + margin)
        ax.set_facecolor("#050510")
        ax.set_xticks([])
        ax.set_yticks([])

        earth = Circle((0, 0), radius=120, color="white")
        ax.add_patch(earth)
        ax.set_title("Press Start to run the simulation", color="white")
        return fig, ax

    def _init_artists(self) -> None:
        for sat in self.satellites:
            sat_pos = sat.position()
            marker = Circle(sat_pos, radius=120, color=sat.color)
            datalink = Circle(sat_pos, radius=sat.datalink_range_km, fill=False, lw=1.5, ec="cyan")
            self.ax.add_patch(datalink)
            self.ax.add_patch(marker)
            self.satellite_markers.append(marker)
            self.datalink_markers.append(datalink)
        self._update_status_text()

    def _build_buttons(self) -> None:
        plt.subplots_adjust(bottom=0.2)
        start_ax = self.fig.add_axes([0.25, 0.05, 0.2, 0.075])
        stop_ax = self.fig.add_axes([0.55, 0.05, 0.2, 0.075])
        start_button = Button(start_ax, "Start", color="#1b5e20", hovercolor="#2e7d32")
        stop_button = Button(stop_ax, "Stop", color="#b71c1c", hovercolor="#d32f2f")

        start_button.on_clicked(self._on_start)
        stop_button.on_clicked(self._on_stop)

    def _on_start(self, _event) -> None:
        if self.finished:
            return
        self.running = True
        self.last_frame_time = None
        self.ax.set_title("Simulation running...", color="white")

    def _on_stop(self, _event) -> None:
        if self.finished:
            return
        self.running = False
        self.finished = True
        self.ax.set_title("Simulation stopped", color="white")
        self._update_status_text()
        self.animation.event_source.stop()
        self._send_to_invoice()

    def _update(self, _frame):
        now = time.perf_counter()
        if self.last_frame_time is None:
            self.last_frame_time = now
            return self.satellite_markers + self.datalink_markers

        dt = now - self.last_frame_time
        self.last_frame_time = now

        if not self.running:
            return self.satellite_markers + self.datalink_markers

        self.elapsed_seconds += dt
        positions: List[tuple[float, float]] = []
        for sat, marker, datalink in zip(self.satellites, self.satellite_markers, self.datalink_markers):
            sat.advance(dt)
            pos = sat.position()
            positions.append(pos)
            marker.center = pos
            datalink.center = pos

        self._update_link_status(positions, dt)
        self._update_status_text()
        return self.satellite_markers + self.datalink_markers

    def _update_link_status(self, positions: List[tuple[float, float]], dt: float) -> None:
        (x1, y1), (x2, y2) = positions
        distance = math.dist((x1, y1), (x2, y2))
        range_sum = sum(s.datalink_range_km for s in self.satellites)
        link_active = distance <= range_sum

        if link_active:
            self.megabytes_transferred += TRANSFER_RATE_MB_PER_SEC * dt
            for datalink in self.datalink_markers:
                datalink.set_edgecolor("lime")
        else:
            for datalink in self.datalink_markers:
                datalink.set_edgecolor("cyan")

    def _update_status_text(self) -> None:
        status = (
            f"Elapsed: {self.elapsed_seconds:6.1f}s\n"
            f"Transferred: {self.megabytes_transferred:8.2f} MB\n"
            f"Rate: {TRANSFER_RATE_MB_PER_SEC:.0f} MB/s"
        )
        self.status_text.set_text(status)

    def _send_to_invoice(self) -> None:
        if self.megabytes_transferred <= 0:
            print("No data transferred; invoice will not be created.")
            return

        amount = self.megabytes_transferred * PRICE_PER_MB
        session_id = f"sat-sim-{int(time.time())}"
        summary = {
            "sessionId": session_id,
            "elapsedSeconds": round(self.elapsed_seconds, 2),
            "megabytesTransferred": round(self.megabytes_transferred, 2),
            "rateMbPerSec": TRANSFER_RATE_MB_PER_SEC,
            "pricePerMb": PRICE_PER_MB,
            "amountDue": round(amount, 2),
        }

        print("\nSimulation summary:")
        print(json.dumps(summary, indent=2))

        project_root = Path(__file__).resolve().parents[1]
        tsx_command = [
            "npx",
            "tsx",
            "scripts/btcpay_create_invoice.ts",
            f"--amount={amount:.2f}",
            f"--megabytes={self.megabytes_transferred:.2f}",
            f"--seconds={self.elapsed_seconds:.2f}",
            f"--session={session_id}",
        ]

        print("\nForwarding usage to invoice generator...\n")
        try:
            result = subprocess.run(
                tsx_command,
                cwd=project_root,
                check=True,
                text=True,
                capture_output=True,
            )
        except subprocess.CalledProcessError as exc:
            print("Invoice creation failed:")
            print(exc.stdout)
            print(exc.stderr, file=sys.stderr)
            return

        print(result.stdout)
        if result.stderr:
            print(result.stderr, file=sys.stderr)


def main() -> None:
    satellites = [
        Satellite(
            name="A",
            altitude_km=450,
            orbital_velocity_km_s=7.8,
            datalink_range_km=350,
            color="#ff9800",
            initial_phase_rad=0.0,
        ),
        Satellite(
            name="B",
            altitude_km=700,
            orbital_velocity_km_s=8.2,
            datalink_range_km=350,
            color="#03a9f4",
            initial_phase_rad=math.pi / 2,
        ),
    ]

    simulation = SatelliteSimulation(satellites)
    plt.show()


if __name__ == "__main__":
    main()
