<script lang="ts">

</script>

<div class="mt-2 flex flex-col gap-2">
						{#each worldLoreEntries as entry, i}
							<details
								class="bg-surface-100-900 flex flex-col gap-1 rounded border p-2"
							>
								<summary
									class="flex cursor-pointer items-center gap-2 select-none"
								>
									<span class="truncate font-mono text-sm">
										{entry.name || "(No Name)"}
									</span>
								</summary>
								<div class="text-muted-foreground mt-2 text-xs">
									{entry.content}
								</div>
								<details class="mt-2">
									<summary
										class="cursor-pointer text-xs font-semibold select-none"
									>
										More Info
									</summary>
									<div
										class="mt-2 flex flex-col gap-1 text-xs"
									>
										<div>
											<span class="font-semibold">
												Keys:
											</span>
											{Array.isArray(entry.keys)
												? entry.keys.join(", ")
												: ""}
										</div>
										<div>
											<span class="font-semibold">
												Regex:
											</span>
											{entry.useRegex ? "Yes" : "No"}
										</div>
										<div>
											<span class="font-semibold">
												Case Sensitive:
											</span>
											{entry.caseSensitive ? "Yes" : "No"}
										</div>
										<div>
											<span class="font-semibold">
												Priority:
											</span>
											{entry.priority}
										</div>
										<div>
											<span class="font-semibold">
												Constant:
											</span>
											{entry.constant ? "Yes" : "No"}
										</div>
										<div>
											<span class="font-semibold">
												Enabled:
											</span>
											{entry.enabled ? "Yes" : "No"}
										</div>
									</div>
								</details>
							</details>
						{/each}
					</div>