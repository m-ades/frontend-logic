const hurleyRules = {
    // Logicpenguin system rules
    "Pr"  : { premiserule: true },
    "Ass" : { assumptionrule: true, hidden: true },
    "ACP" : { assumptionrule: true, opens: true },
    "AIP" : { assumptionrule: true, opens: true },
    "CP"  : { forms: [ { conc: "A ⊃ B", closes: true } ] },
    "IP"  : { forms: [ { conc: "A", closes: true } ] },
    
    // Rules of Inference
    "MP"  : { forms: [ { prems: ["A ⊃ B", "A"], conc: "B" } ] },
    "MT"  : { forms: [ { prems: ["A ⊃ B", "~B"], conc: "~A" } ] },
    "HS"  : { forms: [ { prems: ["A ⊃ B", "B ⊃ C"], conc: "A ⊃ C" } ] },
    "DS"  : { forms: [ { prems: ["A ∨ B", "~A"], conc: "B" } ] },
    "CD"  : { forms: [ { prems: ["(A ⊃ B) • (C ⊃ D)", "A ∨ C"], conc: "B ∨ D" } ] },
    "Simp" : { forms: [ { prems: ["A • B"], conc: "A" } ] },
    "Conj" : { forms: [ { prems: ["A", "B"], conc: "A • B" } ] },
    "Add" : { forms: [ { prems: ["A"], conc: "A ∨ B" }, { prems: ["A"], conc: "B ∨ A" } ] },
    

    // Rules of Replacement
    "DM" : { replacementrule: true, forms: [
        { a: "~(A • B)", b: "~A ∨ ~B" },
        { a: "~(A ∨ B)", b: "~A • ~B" }
    ]},
    "Com" : { replacementrule: true, forms: [
        { a: "A ∨ B", b: "B ∨ A" },
        { a: "A • B", b: "B • A" }
    ]},
    "Assoc" : { replacementrule: true, forms: [
        { a: "[A ∨ (B ∨ C)]", b: "[(A ∨ B) ∨ C]" },
        { a: "[A • (B • C)]", b: "[(A • B) • C]" }
    ]},
    "Dist" : { replacementrule: true, forms: [
        { a: "[A • (B ∨ C)]", b: "[(A • B) ∨ (A • C)]" },
        { a: "[A ∨ (B • C)]", b: "[(A ∨ B) • (A ∨ C)]" }
    ]},
    "DN" : { replacementrule: true, forms: [
        { a: "A", b: "~~A" },
        { a: "~~A", b: "A" }
    ]},
    "Trans" : { replacementrule: true, forms: [
        { a: "(A ⊃ B)", b: "(~B ⊃ ~A)" }
    ]},
    "Impl" : { replacementrule: true, forms: [
        { a: "(A ⊃ B)", b: "(~A ∨ B)" }
    ]},
    "Equiv" : { replacementrule: true, forms: [
        { a: "(A ≡ B)", b: "[(A ⊃ B) • (B ⊃ A)]" },
        { a: "(A ≡ B)", b: "[(A • B) ∨ (~A • ~B)]" }
    ]},
    "Exp" : { replacementrule: true, forms: [
        { a: "[(A • B) ⊃ C]", b: "[A ⊃ (B ⊃ C)]" }
    ]},
    "Taut" : { replacementrule: true, forms: [
        { a: "A", b: "(A ∨ A)" },
        { a: "A", b: "(A • A)" }
    ]},
    

    // Rules for Removing and Introducing Quantifiers

    "UI"  : { pred: true, forms: [ 
        { 
            prems: ["∀xAx"], 
            conc: "At" 
        }
    ]},
    "UG"  : { pred: true, forms: [ { prems: ["An"], conc: "∀xAx", subst: {"x":"n"} } ] },
    "EI"  : { pred: true, forms: [ { prems: ["∃xAx"], conc: "Aa", mustbenew: ["a"], subst: {"x":"a"} } ] },

    "EG"  : { pred: true, forms: [ 
        { prems: ["Aa"], conc: "∃xAx", subst: {"x":"a"} },  
        { prems: ["Ay"], conc: "∃xAx", subst: {"x":"y"} }
    ]},
    
    // Change of Quantifier Rules
    "CQ" : { pred: true, replacementrule: true, forms: [
        { a: "∀xAx", b: "~∃x~Ax" },
        { a: "∃xAx", b: "~∀x~Ax" },
        { a: "~∀xAx", b: "∃x~Ax" },
        { a: "~∃xAx", b: "∀x~Ax" },
        { a: "∀x~Ax", b: "~∃xAx" },
        { a: "∃x~Ax", b: "~∀xAx" }
    ]},
    "QN" : { pred: true, replacementrule: true, forms: [
        { a: "~∀xAx", b: "∃x~Ax" },
        { a: "~∃xAx", b: "∀x~Ax" },
        { a: "∀x~Ax", b: "~∃xAx" },
        { a: "∃x~Ax", b: "~∀xAx" }
    ]},
    
    // Identity Rules
    "=I"  : { pred: true, identity: true, forms: [ { prems: [], conc: 'a = a' } ]},
    "=O" : { pred: true, identity: true, forms: [ { prems: ["a = b", "A"], conc: "B", differsatmostby: ["B","A","b","a"] }, { prems: ["a = b", "A"], conc: "B", differsatmostby: ["B","A","a","b"] } ] },
}

export default function getHurleyRuleset() {
    return hurleyRules;
}
