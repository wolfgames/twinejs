export const footerData = () => {
	return `(set: _index to 16)
(for: each _item, ...(dm-values: $chats))[
  (css: "display:none;")[
  (set: _index to _index - 1)
  (set: $val to "")
  (for: each _i, ...(range: 1, 16))[
    (if: _index is _i)[
      (set: $val to (joined: "", $val, "Y"))
    ](else:)[
      (set: $val to (joined: "", $val, "="))
    ]
  ]
  ]
  (float-box: "=XXX=",$val)[_item]
]`;
};
