defmodule VpsAdmin.Worker.Executor.Server do
  use GenServer, restart: :temporary

  require Logger
  alias VpsAdmin.Worker
  alias VpsAdmin.Worker.{CommandHandler, ResultReporter}

  ### Client interface
  def start_link({{t, cmd}, _func} = arg) do
    GenServer.start_link(__MODULE__, arg, name: via_tuple({t, cmd}))
  end

  def report_result({t, cmd}) do
    GenServer.cast(via_tuple({t, cmd}), {:report_result, {t, cmd}})
  end

  def retrieve_result({t, cmd}, func) do
    GenServer.call(via_tuple({t, cmd}), {:retrieve_result, func})
  end

  defp via_tuple({t, cmd}) do
    {:via, Registry, {Worker.Registry, {:executor, t, cmd.id}}}
  end

  ### Server implementation
  @impl true
  def init({{t, cmd}, func}) do
    # Process.flag(:trap_exit, true)
    {:ok, %{
      command: {t, cmd},
      func: func,
      result: nil
    }, {:continue, :startup}}
  end

  @impl true
  def handle_continue(:startup, %{command: {t, cmd}, func: func} = state) do
    case CommandHandler.run({t, cmd}, func) do
      {:ok, {t, cmd}} ->
        {:noreply, %{state | command: {t, cmd}}}

      {:done, {t, cmd}} ->
        do_report_result({t, cmd}, %{state | command: {t, cmd}})
    end
  end

  @impl true
  def handle_call({:retrieve_result, func}, _from, %{result: res, func: func} = state) when not is_nil(res) do
    {:stop, :normal, {:ok, {:done, res}}, state}
  end

  def handle_call({:retrieve_result, func}, _from, %{func: func} = state) do
    {:reply, {:ok, {:running, self()}}, state}
  end

  def handle_call({:retrieve_result, _func}, _from, state) do
    {:reply, {:error, :badfunc}, state}
  end

  @impl true
  def handle_cast({:queue, {t, cmd}, :executing}, %{command: {t, cmd}} = state) do
    Logger.debug("Begun execution/rollback of enqueued command #{t}:#{cmd.id}")
    {:noreply, state}
  end

  def handle_cast({:queue, {t, cmd}, :done, :normal}, %{command: {t, cmd}} = state) do
    Logger.debug("Execution/rollback of enqueued command #{t}:#{cmd.id} finished")
    {:noreply, state}
  end

  def handle_cast({:queue, {t, cmd}, :done, reason}, %{command: {t, cmd}} = state) do
    Logger.debug(
      "Execution/rollback of enqueued command #{t}:#{cmd.id} failed with "<>
      "'#{inspect(reason)}'"
    )
    do_report_result(
      {state.t, %{state.cmd | status: :failed, output: %{error: reason}}},
      state
    )
  end

  def handle_cast({:queue, {:transaction, t}, :reserved}, %{command: {t, cmd}} = state) do
    Logger.debug("Reserved slot(s) in queue #{cmd.queue}")
    do_report_result({t, %{cmd | status: :done}}, state)
  end

  def handle_cast({:report_result, {t, cmd}}, state) do
    do_report_result({t, cmd}, state)
  end

  # @impl true
  # def handle_info({:EXIT, reporter, :normal}, %{reporter: reporter} = state) do
  #   Logger.debug("Ignoring reporter exit")
  #   {:noreply, state}
  # end

  defp do_report_result({t, cmd}, state) do
    Logger.debug("Reporting result of command #{t}:#{cmd.id}")

    case ResultReporter.report({t, cmd}) do
      :ok ->
        {:stop, :normal, state}

      {:error, error} ->
        Logger.debug("Failed to report command result due to #{error} error")
        {:noreply, %{state | result: cmd}}
    end
  end
end