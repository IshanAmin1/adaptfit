import { getQueueWithListener } from "../services/tasks.js";
import {
	STATUS_STREAM_HEARTBEAT_MS,
	STATUS_STREAM_TIMEOUT_MS,
} from "../config/env/server.js";

function sendSseMessage(res, event) {
	res.write(`data: ${JSON.stringify(event)}\n\n`);
}

function sendSseComment(res, comment) {
	res.write(`: ${comment}\n\n`);
}

export function streamQueueJobStatus(queueName, onCompleted) {
	return async (req, res) => {
		const startedAt = Date.now();
		const { queue, listener } = getQueueWithListener(queueName);
		const job = await queue.getJob(req.params.jobId);

		if (!job || job.data?.userId !== req.user.id) {
			return res.status(404).json({ error: "Job could not be found." });
		}

		res.setHeader("Content-Type", "text/event-stream");
		res.setHeader("Connection", "keep-alive");
		res.setHeader("Cache-Control", "no-cache");
		res.setHeader("X-Accel-Buffering", "no");
		res.flushHeaders?.();

		let closed = false;
		sendSseComment(res, "connected");

		const heartbeat = setInterval(() => {
			sendSseComment(res, "keep-alive");
		}, STATUS_STREAM_HEARTBEAT_MS);
		heartbeat.unref?.();

		const streamTimeout = setTimeout(() => {
			console.warn(
				`SSE stream timed out after ${Date.now() - startedAt}ms queue=${queueName} job=${
					job.id
				} user=${req.user.id}.`,
			);
			send({
				type: "error",
				error:
					"Request is still running after the maximum wait time. Please try again shortly.",
			});
			cleanup();
		}, STATUS_STREAM_TIMEOUT_MS);
		streamTimeout.unref?.();

		const send = (event) => {
			if (closed) {
				return;
			}

			sendSseMessage(res, event);
		};

		const cleanup = (reason = "closed") => {
			if (closed) {
				return;
			}

			const durationMs = Date.now() - startedAt;
			if (reason === "client_closed" && durationMs >= 55000) {
				console.warn(
					`SSE stream client closed after ${durationMs}ms queue=${queueName} job=${job.id} user=${req.user.id}.`,
				);
			}

			closed = true;
			clearInterval(heartbeat);
			clearTimeout(streamTimeout);
			listener.off("progress", onProgress);
			listener.off("completed", onCompletedEvent);
			listener.off("failed", onFailed);
			res.end();
		};

		const onProgress = ({ jobId, data }) => {
			if (String(jobId) !== String(job.id)) {
				return;
			}

			send({ type: "progress", ...data });
		};

		const onCompletedEvent = async ({ jobId, returnvalue }) => {
			if (String(jobId) !== String(job.id)) {
				return;
			}

			try {
				await onCompleted({ req, job, returnvalue, send });
			} catch (error) {
				console.error(error);
				send({
					type: "error",
					error: error.message || "Request could not be completed.",
					invalidFields: error.invalidFields,
					rejectionReasons: error.rejectionReasons,
				});
			}

			cleanup();
		};

		const onFailed = ({ jobId, failedReason }) => {
			if (String(jobId) !== String(job.id)) {
				return;
			}

			send({
				type: "error",
				error: failedReason || "request failed.",
			});
			cleanup();
		};

		listener.on("progress", onProgress);
		listener.on("completed", onCompletedEvent);
		listener.on("failed", onFailed);
		req.on("close", () => cleanup("client_closed"));

		const state = await job.getState();

		if (job.progress && typeof job.progress === "object") {
			send({ type: "progress", ...job.progress });
		}

		if (state === "completed") {
			await onCompletedEvent({ jobId: job.id, returnvalue: job.returnvalue });
			return;
		}

		if (state === "failed") {
			onFailed({ jobId: job.id, failedReason: job.failedReason });
		}
	};
}
