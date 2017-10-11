defmodule VpsAdmin.Cluster.Schema.Transaction.Chain do
  use VpsAdmin.Cluster.Schema

  import EctoEnum, only: [defenum: 2]
  defenum State, staged: 0, running: 1, done: 2, failed: 3

  schema "transaction_chains" do
    field :label, :string
    field :state, State, default: :staged
    field :progress, :integer, default: 0
    timestamps()

    has_many :transactions, Schema.Transaction, foreign_key: :transaction_chain_id
  end

  def changeset(chain, params \\ %{}) do
    chain
    |> Ecto.Changeset.change(params)
  end
end
