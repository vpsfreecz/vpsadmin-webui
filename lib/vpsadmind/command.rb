module VpsAdmind
  class CommandFailed < StandardError
    attr_reader :cmd, :rc, :output

    def initialize(cmd, rc, out)
      @cmd = cmd
      @rc = rc
      @output = out
    end

    def message
      "command '#{@cmd}' exited with code '#{@rc}', output: '#{@output}'"
    end
  end

  class CommandNotImplemented < StandardError

  end

  class Command
    include Utils::Compat
    include Utils::Log

    attr_reader :trans

    @@handlers = {}

    def initialize(trans)
      @chain = {
          :id => trans['transaction_chain_id'].to_i,
          :state => trans['chain_state'].to_i,
          :progress => trans['chain_progress'].to_i,
          :size => trans['chain_size'].to_i
      }
      @trans = trans
      @output = {}
      @status = :failed
      @m_attr = Mutex.new
    end

    def execute
      klass = handler

      unless klass
        @output[:error] = 'Unsupported command'
        return false
      end

      begin
        param = JSON.parse(@trans['t_param'])

      rescue
        @output[:error] = 'Bad param syntax'
        return false
      end

      param[:vps_id] = @trans['t_vps'].to_i

      @cmd = class_from_name(klass).new(self, param)

      @m_attr.synchronize { @time_start = Time.new.to_i }

      if original_chain_direction == :execute
        safe_call(klass, :exec)

      else
        if reversible?
          safe_call(klass, :rollback)

        else
          @status = :failed
        end
      end

      @time_end = Time.new.to_i
    end

    def bad_value(klass)
      raise CommandFailed.new('process handler return value', 1, "#{klass} did not return expected value")
    end

    def save(db)
      db.transaction do |t|
        save_transaction(t)

        if @status == :ok && !@rollbacked
          # Chain is finished, close up
          if chain_finished?
            run_confirmations(t)
            close_chain(t)

          else # There are more transaction in this chain
            continue_chain(t)
          end

        elsif @status == :failed || @rollbacked
          # Fail if already rollbacking
          if original_chain_direction == :rollback && !@rollbacked
            log(:critical, :chain, 'Transaction rollback failed, admin intervention is necessary')
            # FIXME: do something

            # Is it the last transaction to rollback?
            if chain_finished?
              run_confirmations(t)
              close_chain(t)

            else
              fail_all(t)
              close_chain(t)
            end

          else # Reverse chain direction
            if reversible?
              rollback_chain(t)
              fail_followers(t)
            else
              fail_followers(t)
              close_chain(t)
            end
          end
        end
      end
    end

    def save_transaction(db)
      log(:debug, self, 'Saving transaction')
      @cmd.post_save(db) if @cmd && current_chain_direction == :execute

      if current_chain_direction == :execute
        done = 1
      else
        done = 2 # rollbacked
      end

      db.prepared(
          'UPDATE transactions SET t_done=?, t_success=?, t_output=?, t_real_start=?, t_end=? WHERE t_id=?',
          done, {:failed => 0, :ok => 1, :warning => 2}[@status], (@cmd ? @output.merge(@cmd.output) : @output).to_json, @time_start, @time_end, @trans['t_id']
      )
    end

    def run_confirmations(t)
      dir = current_chain_direction
      log(:debug, self, 'Running transaction confirmations')

      st = t.prepared_st('SELECT table_name, row_pks, attr_changes, confirm_type, t.t_success
                          FROM transactions t
                          INNER JOIN transaction_confirmations c ON t.t_id = c.transaction_id
                          WHERE
                              t.transaction_chain_id = ?
                              AND done = 0',
                         chain_id)

      st.each do |row|
        success = row[4].to_i > 0
        pk = pk_cond(YAML.load(row[1]))

        case row[3].to_i
          when 0 # create
            if success && dir == :execute
              t.query("UPDATE #{row[0]} SET confirmed = 1 WHERE #{pk}")
            else
              t.query("DELETE FROM #{row[0]} WHERE #{pk}")
            end

          when 1 # edit before
            if !success || dir == :rollback
              attrs = YAML.load(row[2])
              update = attrs.collect { |k, v| "`#{k}` = #{sql_val(v)}" }.join(',')

              t.query("UPDATE #{row[0]} SET #{update} WHERE #{pk}")
            end

          when 2 # edit after
            if success && dir == :execute
              attrs = YAML.load(row[2])
              update = attrs.collect { |k, v| "`#{k}` = #{sql_val(v)}" }.join(',')

              t.query("UPDATE #{row[0]} SET #{update} WHERE #{pk}")
            end

          when 3 # destroy
            if success && dir == :execute
              t.query("DELETE FROM #{row[0]} WHERE #{pk}")
            else
              t.query("UPDATE #{row[0]} SET confirmed = 1 WHERE #{pk}")
            end

          when 4 # just destroy
            if success && dir == :execute
              t.query("DELETE FROM #{row[0]} WHERE #{pk}")
            end

          when 5 # decrement
            if success && dir == :execute
              attr = YAML.load(row[2])

              t.query("UPDATE #{row[0]} SET #{attr} = #{attr} - 1 WHERE #{pk}")
            end

          when 6 # increment
            if success && dir == :execute
              attr = YAML.load(row[2])

              t.query("UPDATE #{row[0]} SET #{attr} = #{attr} + 1 WHERE #{pk}")
            end
        end
      end

      st.close

      t.prepared('UPDATE transaction_confirmations c
                  INNER JOIN transactions t ON t.t_id = c.transaction_id
                  SET c.done = 1
                  WHERE t.transaction_chain_id = ? AND c.done = 0',
                 @chain[:id])
    end

    def continue_chain(db)
      log(:debug, self, 'Continue chain')
      db.prepared("UPDATE transaction_chains
                   SET `progress` = `progress` #{current_chain_direction == :execute ? '+' : '-'} 1
                   WHERE id = ?", chain_id)
    end

    def rollback_chain(db)
      log(:debug, self, 'Rollback chain')
      db.prepared('UPDATE transaction_chains
                   SET `state` = 3
                   WHERE id = ?', chain_id)
    end

    def close_chain(db)
      log(:debug, self, 'Close chain')
      # mark chain as finished
      db.prepared('UPDATE transaction_chains
                   SET `state` = ?, `progress` = `progress` + 1
                   WHERE id = ?', current_chain_direction == :execute ? 2 : 4, chain_id)

      # release all locks
      db.prepared('DELETE FROM resource_locks WHERE transaction_chain_id = ?', chain_id)
    end

    def fail_followers(db)
      log(:debug, self, 'Fail followers')
      db.prepared('UPDATE transactions
                   SET t_done = 1, t_success = 0, t_output = ?
                   WHERE
                       transaction_chain_id = ?
                       AND t_id > ?',
                  {:error => 'Dependency failed'}.to_json,
                  chain_id,
                  id
      )
    end

    def fail_all(db)
      log(:debug, self, 'Fail all')
      db.prepared('UPDATE transactions
                   SET t_done = 1, t_success = 0, t_output = ?
                   WHERE
                       transaction_chain_id = ?',
                  {:error => 'Chain failed'}.to_json,
                  chain_id
      )
    end

    def killed(hard)
      @cmd.killed

      if hard
        @output[:error] = 'Killed'
        @status = :failed
      end
    end

    def chain_id
      @chain[:id]
    end

    alias_method :worker_id, :chain_id

    def id
      @trans["t_id"]
    end

    def type
      @trans["t_type"]
    end

    def urgent?
      @trans['t_urgent'].to_i == 1
    end

    def handler
      @@handlers[@trans["t_type"].to_i]
    end

    def step
      @cmd.step
    end

    def subtask
      @cmd.subtask
    end

    def time_start
      @m_attr.synchronize { @time_start }
    end

    def current_chain_direction
      if @rollbacked
        :rollback
      else
        original_chain_direction
      end
    end

    def original_chain_direction
      if @chain[:state] == 3 || @rollbacked
        :rollback
      else
        :execute
      end
    end

    def Command.register(klass, type)
      @@handlers[type] = klass
      log(:info, :init, "Cmd ##{type} => #{klass}")
    end

    private
    def safe_call(klass, m)
      begin
        ret = @cmd.send(m)

        begin
          @status = ret[:ret]

          if @status == nil
            bad_value(klass)
          end

        rescue
          bad_value(klass)
        end

      rescue CommandFailed => err
        @status = :failed
        @output[:cmd] = err.cmd
        @output[:exitstatus] = err.rc
        @output[:error] = err.output

        # FIXME: if rollback fails, original error is overwritten!
        if m == :exec
          log(:debug, self, 'Transaction failed, running rollback')
          @rollbacked = true
          safe_call(klass, :rollback)
        end

      rescue CommandNotImplemented
        @status = :failed
        @output[:error] = 'Command not implemented'

      rescue => err
        @status = :failed
        @output[:error] = err.inspect
        @output[:backtrace] = err.backtrace
        p @output

        # FIXME: if rollback fails, original error is overwritten!
        if m == :exec
          log(:debug, self, 'Transaction failed, running rollback')
          @rollbacked = true
          safe_call(klass, :rollback)
        end
      end
    end

    def chain_finished?
      if current_chain_direction == :execute
        @chain[:size] == @chain[:progress] + 1
      else
        # Must check <= 0, because chain might contain a single transaction,
        # and when that fails, the result is -1.
        @chain[:progress] - 1 <= 0
      end
    end

    def reversible?
      @trans['reversible'].to_i == 1
    end

    def pk_cond(pks)
      pks.map { |k, v| "`#{k}` = #{sql_val(v)}" }.join(' AND ')
    end

    def sql_val(v)
      if v.is_a?(Integer)
        v
      elsif v.nil?
        'NULL'
      else
        "'#{v}'"
      end
    end
  end
end
