<!-- https://it-rat.com/services/keyryx.html -->

# Keyryx, the key custody and witness plane

> Key custody and an independent witness for the agent-governance record. Custody signs for granted consumers; the witness reads the record without writing to it.

One Go binary with two roles that never share a process. Custody holds the signing keys and signs for the consumers it grants a key. The witness reads the record without writing to it, keeps what it saw, and reports when something it saw is gone. Neither role sits on a request path.

## Custody signs. The witness remembers.

The witness is there to disagree with custody if custody is ever compromised, so the two run as separate processes with separate keys, uids and data directories.

### Keys that stay in the store

Keys of three algorithms, each wrapped under AES-256-GCM with a key derived from the root key and bound to its name and id. A private half is never written in the clear, and a record that is moved or edited refuses to start.

### Consumers get what they were granted

A consumer authenticates one way: its own socket, a bearer key compared by digest, or a Kubernetes token. It signs only with the keys its policy grants. A refusal answers a status and nothing else, and the reason goes to the operator's log.

### Delegated keys, proven first

A high-rate signer generates its own key and proves it holds it. Custody certifies the key for a bounded life and publishes it with an overlap, so a verifier that caches the set keeps verifying through a rotation.

### A witness that keeps what it saw

The witness keeps the bytes it read and hashes them again each interval. A changed byte is reported as a rewrite, a shorter stream as a truncation, and a new chain in the middle as a restart. Its own log is an RFC 9162 tree, and each head is signed with ECDSA P-384 and ML-DSA-65 side by side.

### A check you can run without the service

`keyryx verify` checks a witness log, or streams and their checkpoints, from files alone. An empty directory is reported as measured nothing, never as OK.

## Who signs, who watches, and who only reads.

Verifiers read the published key sets and never call custody for each request. The witness reads the event bus and writes its own findings to a volume of its own.

## Stated rather than discovered later.

- It is on no request path. Enforcement points and agents never wait on it, and verifiers keep verifying when it is down.

- It makes no decision. It signs what a granted consumer asks, and it judges no tool call and refuses nothing for money.

- It issues no agent identity and holds no provider key.

- It never holds a delegated private key. That half stays with its consumer.

- It calls no paid service. A time-stamping authority is called only when an operator names one.

## Running in stack-single today.

- Custody and the witness run as separate containers in the stack-single Compose file, each under its own uid.

- Wardryx signs its approval tokens through Keyryx, so the approval key is held by custody.

- Vouchryx still signs its tokens with its own key file. The Keyryx signer for it is optional, and the launcher does not set it.

- The witness reads the event bus. The launcher sets no Trailryx record folder and no checkpoint folder, so the witness reads no Trailryx pack and no checkpoint yet.

- Trailryx packs are unsigned by default. The Keyryx root signer is opt-in, and the launcher leaves it off.

## What is not proven yet.

- No shipped consumer asks for or renews a delegated key yet, so that part of the design has been tested only in the repository.

- The witness and custody share a host. They are separate users, volumes and keys, not separate trust domains. An anchor off the host is the operator's to add, and no public time-stamping authority has been asked.

- The first witness read pins the delegation root that custody serves, unless an operator sets the pin before it starts.

- No real Kubernetes cluster has authenticated a consumer yet. The projected-token path is tested against tokens the repository mints.

- Custody's use log is protected against edits in its middle, not against a rewrite from its first line, and the witness does not read it.

- The root key is a file. No cloud key management is wired in.

### Build the binary and read its version.

### The Keyryx guide

## Custody and the witness, in short

**Q: Is Keyryx a cloud key vault?**
No. It is a process you run beside the stack, with a wrapped key store on disk under a root key that is a file. It has no cloud key management. A cloud key adapter would be a metered dependency, so it is an option an operator decides on, never a default.

**Q: Does a request wait on Keyryx?**
No. Verifiers cache the key sets it publishes and keep verifying when it is down. The synchronous calls are rare by design: an approval being granted, a seal, and the renewal of a delegated key.

**Q: Can the witness stop a bad write?**
No. It reads the record, reports what it finds and countersigns what it sees. Whatever follows from a finding is the operator's decision, and the finding stays in its own log either way.
