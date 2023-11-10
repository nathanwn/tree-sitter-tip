const PREC = {
  lambda: -2,
  typed_parameter: -1,
  conditional: -1,
  parenthesized_expression: 1,
  parenthesized_list_splat: 1,
  or: 10,
  and: 11,
  not: 12,
  compare: 13,
  bitwise_or: 14,
  bitwise_and: 15,
  xor: 16,
  shift: 17,
  add: 18,
  mul: 19,
  unary: 20,
  power: 21,
  paren_exp: 22,
  fun_call: 23,
};

module.exports = grammar({
  name: "tip",

  extras: $ => [
    $.line_comment,
    $.block_comment,
    /\s/
  ],

  rules: {
    program: $ => repeat($.fun),
    fun: $ => seq(
        field("name", $.identifier),
        '(',
        field("args", optional(commaSep1($.identifier))),
        ')',
        field("block", $.fun_block),
    ),
    fun_block: $ => seq(
        '{',
        repeat($.var_stmt),
        repeat($._stmt),
        $.return_stmt,
        '}'
    ),
    _stmt: $ => choice(
        $.assign_stmt,
        $.output_stmt,
        $.error_stmt,
        $.if_stmt,
        $.while_stmt,
        $.stmt_block,
    ),
    assign_stmt: $ => seq($.assignable, "=", $._exp, ";"),
    output_stmt: $ => seq("output", $._exp, ";"),
    if_stmt: $ => prec.right(seq(
        "if", "(", $._exp, ")", field("if_branch", $._stmt),
        optional(seq("else", field("else_branch", $._stmt)))
    )),
    while_stmt: $ => seq("while", "(", $._exp, ")", $.stmt_block),
    stmt_block: $ => seq("{", repeat($._stmt), "}"),
    var_stmt: $ => seq("var", commaSep1($.identifier), ";"),
    return_stmt: $ => seq("return", $._exp, ";"),
    error_stmt: $ => seq("error", $._exp, ";"),
    assignable: $ => choice(
        $.identifier,
        $.deref_write
    ),
    deref_write: $ => seq("*", $._exp),
    _exp: $ => choice(
        $.fun_call,
        $.paren_exp,
        $.unary_exp,
        $.binary_exp,
        field("identifier", $.identifier),
        $.number,
        $.record_exp,
        $.record_field_access,
        "input",
        seq('alloc', $._exp),
        seq('&', $.identifier),
        seq('*', $._exp),
        "null",
    ),
    fun_call: $ => prec(PREC.fun_call, seq($._exp, '(', optional(commaSep1($._exp)), ')')),
    paren_exp: $ => prec(PREC.paren_exp, seq('(', $._exp, ')')),
    unary_exp: $ => prec(PREC.unary, seq(field('op', choice('-')), $._exp)),
    binary_exp: $ => {
        const table = [
            [prec.left, '+', PREC.add],
            [prec.left, '-', PREC.add],
            [prec.left, '*', PREC.mul],
            [prec.left, '/', PREC.mul],
            [prec.left, '>', PREC.compare],
            [prec.left, '==', PREC.compare],
        ];

        return choice(...table.map(([fn, operator, precedence]) => fn(
            precedence, seq(
                field('lhs', $._exp),
                field('op', operator),
                field('rhs', $._exp),
            )
        )));
    },
    record_exp: $ => seq('{', commaSep1($.record_field), '}'),
    record_field: $ => seq($.identifier, ":", $._exp),
    record_field_access: $ => prec(PREC.fun_call, seq($._exp, ".", $.identifier)),
    line_comment: _ => token( seq('//', /[^\n]*/)),
    block_comment: _ => token(seq(
      '/*',
      /[^*]*\*+([^/*][^*]*\*+)*/,
      '/'
    )),
    identifier: _ => /[a-zA-Z_][a-zA-Z0-9_]*/,
    number: _ => /\d+/,
  }
});

function sep1(rule, separator) {
  return seq(rule, repeat(seq(separator, rule)))
}

function commaSep1(rule) {
  return sep1(rule, ",")
}
