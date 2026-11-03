"""Two real-terminal delete scenarios, executed on Ubuntu CI without an editor."""
import json
import os
from pathlib import Path
import pty
import select
import shutil
import subprocess
import tempfile
import time

root = Path(__file__).resolve().parent.parent
node = shutil.which("node")
assert node, "Node.js is required"
entry = root / "dist/cli/main.js"

with tempfile.TemporaryDirectory(prefix="resumeflow-tty-") as temporary:
    project = Path(temporary) / "project"
    project.mkdir()
    data = Path(temporary) / "data"
    options = ["--project", str(project), "--data-dir", str(data), "--format", "json"]
    saved = subprocess.run([node, str(entry), "save", *options], check=True, capture_output=True, text=True)
    checkpoint_id = json.loads(saved.stdout)["data"]["id"]
    path = data / "checkpoints.json"
    before = path.read_bytes()

    def terminal_delete(answer):
        master, slave = pty.openpty()
        process = subprocess.Popen([node, str(entry), "delete", checkpoint_id, *options], stdin=slave, stdout=slave, stderr=slave)
        os.close(slave)
        output = bytearray()
        sent = False
        try:
            deadline = time.monotonic() + 15
            while time.monotonic() < deadline:
                readable, _, _ = select.select([master], [], [], 0.1)
                if readable:
                    try:
                        part = os.read(master, 65536)
                    except OSError:
                        break
                    if not part:
                        break
                    output.extend(part)
                    if not sent and b"[y/N]" in output:
                        os.write(master, answer.encode() + b"\n")
                        sent = True
                elif process.poll() is not None:
                    break
            assert sent, output.decode(errors="replace")
            assert process.wait(timeout=2) == 0, output.decode(errors="replace")
            return output.decode(errors="replace")
        finally:
            if process.poll() is None:
                process.kill()
            process.wait()
            os.close(master)

    cancelled = terminal_delete("n")
    assert '"deleted":false' in cancelled, cancelled
    assert path.read_bytes() == before
    print("TTY-E2E-cancel: PASS (real terminal, original bytes retained)")
    approved = terminal_delete("y")
    assert '"deleted":true' in approved, approved
    assert json.loads(path.read_bytes())["checkpoints"] == []
    print("TTY-E2E-approve: PASS (real terminal, selected record removed)")
    print("TTY summary: 2 passed, 0 failed, 0 skipped")
